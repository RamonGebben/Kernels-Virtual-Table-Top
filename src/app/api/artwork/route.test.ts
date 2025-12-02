/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
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

describe('/api/artwork route handlers', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'artwork-api-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('lists artwork files', async () => {
    const artworkDir = path.join(tmpDir, 'artwork');
    await mkdir(artworkDir, { recursive: true });
    await writeFile(path.join(artworkDir, 'painting.png'), 'file-data');
    await writeFile(path.join(artworkDir, 'notes.txt'), 'ignore-me');

    const { GET } = await importRoute();
    const response = await GET();
    const payload = (await response.json()) as MapListResponse;

    expect(payload.maps.map(map => map.filename)).toContain('painting.png');
    expect(payload.maps.map(map => map.filename)).not.toContain('notes.txt');
  });

  it('stores uploaded artwork and returns an entry', async () => {
    const { POST } = await importRoute();
    const FileCtor = ensureFileCtor();
    const mockFile = new FileCtor(['image'], 'portrait.png', {
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

    expect(payload.filename).toBe('portrait.png');
    const uploaded = await stat(path.join(tmpDir, 'artwork', 'portrait.png'));
    expect(uploaded.isFile()).toBe(true);
  });

  it('deletes artwork files', async () => {
    const artworkDir = path.join(tmpDir, 'artwork');
    await mkdir(artworkDir, { recursive: true });
    await writeFile(path.join(artworkDir, 'portrait.png'), 'file-data');

    const { DELETE } = await importRoute();
    const request = new Request('http://localhost/api/artwork', {
      method: 'DELETE',
      body: JSON.stringify({ filename: 'portrait.png' }),
    });

    const response = await DELETE(request as any);
    expect(response.status).toBe(204);
    await expect(
      stat(path.join(tmpDir, 'artwork', 'portrait.png')),
    ).rejects.toBeTruthy();
  });
});
