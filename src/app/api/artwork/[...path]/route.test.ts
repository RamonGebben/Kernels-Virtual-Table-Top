import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import type { NextRequest } from 'next/server';

const importRoute = async () => {
  vi.resetModules();
  return import('./route');
};

describe('GET /api/artwork/[...path]', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'artwork-file-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    await mkdir(path.join(tmpDir, 'artwork'), { recursive: true });
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('streams a root artwork file with correct mime type', async () => {
    const filePath = path.join(tmpDir, 'artwork', 'portrait.jpg');
    await writeFile(filePath, 'jpeg-bytes');

    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ path: ['portrait.jpg'] }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    const body = await response.text();
    expect(body).toBe('jpeg-bytes');
  });

  it('streams a file inside a subfolder', async () => {
    const subDir = path.join(tmpDir, 'artwork', 'tokens');
    await mkdir(subDir, { recursive: true });
    await writeFile(path.join(subDir, 'hero.png'), 'png-bytes');

    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ path: ['tokens', 'hero.png'] }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    const body = await response.text();
    expect(body).toBe('png-bytes');
  });

  it('returns 404 for missing artwork files', async () => {
    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ path: ['missing.png'] }),
    });

    expect(response.status).toBe(404);
  });

  it('returns 400 when path is absent', async () => {
    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ path: undefined }),
    });

    expect(response.status).toBe(400);
  });
});
