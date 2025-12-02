import { mkdir, readdir, stat, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';

import type { MapEntry, MapListResponse } from '../../../../types/maps';

export const runtime = 'nodejs';

const ARTWORK_DIR = path.join(process.cwd(), 'artwork');
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB default cap
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const ensureArtworkDir = async () => {
  await mkdir(ARTWORK_DIR, { recursive: true });
};

const isImageFile = (filename: string) =>
  IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());

const toEntry = (
  filename: string,
  fileStat: Awaited<ReturnType<typeof stat>>,
): MapEntry => ({
  filename,
  name: path.parse(filename).name,
  size: Number(fileStat.size),
  lastModified: Number(fileStat.mtimeMs),
});

const sanitizeFilename = (filename: string) => path.basename(filename);

const artworkNotFound = (filename: string) =>
  new Response(JSON.stringify({ error: `Artwork not found: ${filename}` }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

export async function GET() {
  await ensureArtworkDir();
  const entries = await readdir(ARTWORK_DIR);

  const items: MapEntry[] = [];
  for (const filename of entries) {
    const fullPath = path.join(ARTWORK_DIR, filename);
    const fileStat = await stat(fullPath);
    if (!fileStat.isFile() || !isImageFile(filename)) continue;
    items.push(toEntry(filename, fileStat));
  }

  const payload: MapListResponse = { maps: items };
  return Response.json(payload);
}

export async function POST(request: NextRequest) {
  await ensureArtworkDir();
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return new Response(
      JSON.stringify({ error: 'Expected form-data field `file`' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return new Response(JSON.stringify({ error: 'File too large' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const filename = sanitizeFilename(file.name);
  const target = path.join(ARTWORK_DIR, filename);
  await writeFile(target, buffer);

  const fileStat = await stat(target);
  const payload: MapEntry = toEntry(filename, fileStat);
  return Response.json(payload, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  await ensureArtworkDir();
  let filename: string | undefined;

  try {
    const body = await request.json();
    filename = sanitizeFilename(body?.filename);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!filename) {
    return new Response(JSON.stringify({ error: 'Missing `filename`' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const target = path.join(ARTWORK_DIR, filename);

  try {
    await unlink(target);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      (error as { code: string }).code === 'ENOENT'
    ) {
      return artworkNotFound(filename);
    }
    throw error;
  }

  return new Response(null, { status: 204 });
}
