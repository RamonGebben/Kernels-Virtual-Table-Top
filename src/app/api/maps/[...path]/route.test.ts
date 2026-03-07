import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import type { NextRequest } from 'next/server';

const importRoute = async () => {
  vi.resetModules();
  return import('./route');
};

describe('GET /api/maps/[...path]', () => {
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

  it('streams a root map file with correct content type', async () => {
    const filePath = path.join(tmpDir, 'maps', 'forest.png');
    await writeFile(filePath, 'image-bytes');

    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ path: ['forest.png'] }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    const body = await response.text();
    expect(body).toBe('image-bytes');
  });

  it('streams a file inside a subfolder', async () => {
    const subDir = path.join(tmpDir, 'maps', 'dungeons');
    await mkdir(subDir, { recursive: true });
    await writeFile(path.join(subDir, 'cave.jpg'), 'jpeg-bytes');

    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ path: ['dungeons', 'cave.jpg'] }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    const body = await response.text();
    expect(body).toBe('jpeg-bytes');
  });

  it('returns 404 for missing files', async () => {
    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ path: ['missing.png'] }),
    });

    expect(response.status).toBe(404);
  });

  it('returns 400 when path is omitted', async () => {
    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ path: undefined }),
    });

    expect(response.status).toBe(400);
  });

  it('returns 400 for paths deeper than 2 segments', async () => {
    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ path: ['a', 'b', 'c.png'] }),
    });

    expect(response.status).toBe(400);
  });
});
