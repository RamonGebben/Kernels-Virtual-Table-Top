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

describe('GET /api/artwork/[filename]', () => {
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

  it('streams artwork file with correct mime type', async () => {
    const filePath = path.join(tmpDir, 'artwork', 'portrait.jpg');
    await writeFile(filePath, 'jpeg-bytes');

    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ filename: 'portrait.jpg' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    const body = await response.text();
    expect(body).toBe('jpeg-bytes');
  });

  it('returns 404 for missing artwork files', async () => {
    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ filename: 'missing.png' }),
    });

    expect(response.status).toBe(404);
  });

  it('returns 400 when filename param is absent', async () => {
    const { GET } = await importRoute();
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ filename: undefined as unknown as string }),
    });

    expect(response.status).toBe(400);
  });
});
