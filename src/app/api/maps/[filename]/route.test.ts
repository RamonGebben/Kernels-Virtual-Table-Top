/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import type { NextRequest } from 'next/server';

const importRoute = async () => {
  vi.resetModules();
  return import('./route');
};

describe('GET /api/maps/[filename]', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'maps-file-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    await mkdir(path.join(tmpDir, 'maps'), { recursive: true });
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('streams the requested map file with content type', async () => {
    const filePath = path.join(tmpDir, 'maps', 'forest.png');
    await writeFile(filePath, 'image-bytes');

    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ filename: 'forest.png' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    const body = await response.text();
    expect(body).toBe('image-bytes');
  });

  it('returns 404 for missing files', async () => {
    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ filename: 'missing.png' }),
    });

    expect(response.status).toBe(404);
  });

  it('returns 400 when filename is omitted', async () => {
    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ filename: undefined }),
    });

    expect(response.status).toBe(400);
  });
});
