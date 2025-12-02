/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mkdtemp,
  mkdir,
  rm,
  stat,
  writeFile,
  readFile,
} from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import type { MapEntry, MapListResponse } from '../../../../types/maps';
import type { NextRequest } from 'next/server';

const ensureFileCtor = () => {
  const needsPolyfill =
    typeof File === 'undefined' ||
    !File.prototype.arrayBuffer ||
    !File.prototype.text;

  if (!needsPolyfill) return File;

  class PolyfillFile {
    name: string;
    lastModified: number;
    private data: string;
    constructor(bits: BlobPart[], name: string, options: FilePropertyBag = {}) {
      this.data = bits.map(part => String(part)).join('');
      this.name = name;
      this.lastModified = options.lastModified ?? Date.now();
    }
    async arrayBuffer(): Promise<ArrayBuffer> {
      return new TextEncoder().encode(this.data).buffer;
    }
  }

  // @ts-expect-error assigning to global for tests
  globalThis.File = PolyfillFile;
  return PolyfillFile as unknown as typeof File;
};

const importRoute = async () => {
  vi.resetModules();
  return import('./route');
};

describe('/api/maps route handlers', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'maps-api-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('lists map files with metadata applied', async () => {
    const mapsDir = path.join(tmpDir, 'maps');
    await mkdir(mapsDir, { recursive: true });
    await writeFile(path.join(mapsDir, 'forest.png'), 'file-data');
    await writeFile(path.join(mapsDir, 'notes.txt'), 'ignore-me');
    await writeFile(
      path.join(mapsDir, 'metadata.json'),
      JSON.stringify({ 'forest.png': { grid: { size: 42 } } }),
    );

    const { GET } = await importRoute();
    const response = await GET();
    const payload = (await response.json()) as MapListResponse;
    const entry = payload.maps.find(map => map.filename === 'forest.png');
    const ignored = payload.maps.find(map => map.filename === 'notes.txt');

    expect(entry?.name).toBe('forest');
    expect(entry?.grid?.size).toBe(42);
    expect(ignored).toBeUndefined();
  });

  it('stores uploaded maps and returns an entry', async () => {
    const { POST } = await importRoute();
    const FileCtor = ensureFileCtor();
    const mockFile = new FileCtor(['image'], 'cave.png', {
      type: 'image/png',
    });
    const request = {
      formData: async () =>
        ({
          get: () => mockFile as File,
        }) as unknown as FormData,
    } as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(201);
    const payload = (await response.json()) as MapEntry;

    expect(payload.filename).toBe('cave.png');
    const uploaded = await stat(path.join(tmpDir, 'maps', 'cave.png'));
    expect(uploaded.isFile()).toBe(true);
  });

  it('deletes maps and clears persisted metadata', async () => {
    const mapsDir = path.join(tmpDir, 'maps');
    await mkdir(mapsDir, { recursive: true });
    await writeFile(path.join(mapsDir, 'forest.png'), 'file-data');
    await writeFile(
      path.join(mapsDir, 'metadata.json'),
      JSON.stringify({ 'forest.png': { grid: { size: 55 } } }),
    );

    const { DELETE } = await importRoute();
    const request = new Request('http://localhost/api/maps', {
      method: 'DELETE',
      body: JSON.stringify({ filename: 'forest.png' }),
    });

    const response = await DELETE(request as any);
    expect(response.status).toBe(204);
    await expect(
      stat(path.join(tmpDir, 'maps', 'forest.png')),
    ).rejects.toBeTruthy();
    const metadataRaw = await readFile(
      path.join(tmpDir, 'maps', 'metadata.json'),
      'utf-8',
    );
    expect(JSON.parse(metadataRaw)['forest.png']).toBeUndefined();
  });
});
