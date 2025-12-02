import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';

import type { MapEntry, MapListResponse } from '../../../../types/maps';
import { readMetadata, removeMetadataForMap } from '../../../lib/mapMetadata';

export const runtime = 'nodejs';

const MAPS_DIR = path.join(process.cwd(), 'maps');
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB default cap

const ensureMapsDir = async () => {
  await mkdir(MAPS_DIR, { recursive: true });
};

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

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

const mapNotFound = (filename: string) =>
  new Response(JSON.stringify({ error: `Map not found: ${filename}` }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

export async function GET() {
  await ensureMapsDir();
  const entries = await readdir(MAPS_DIR);
  const metadata = await readMetadata();

  const maps: MapEntry[] = [];
  for (const filename of entries) {
    const fullPath = path.join(MAPS_DIR, filename);
    const fileStat = await stat(fullPath);
    if (!fileStat.isFile() || !isImageFile(filename)) continue;
    maps.push({
      ...toEntry(filename, fileStat),
      grid: metadata[filename]?.grid,
    });
  }

  const payload: MapListResponse = { maps };
  return Response.json(payload);
}

export async function POST(request: NextRequest) {
  await ensureMapsDir();
  const metadata = await readMetadata();
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
  const target = path.join(MAPS_DIR, filename);
  await writeFile(target, buffer);

  const fileStat = await stat(target);
  const payload: MapEntry = {
    ...toEntry(filename, fileStat),
    grid: metadata[filename]?.grid,
  };
  return Response.json(payload, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  await ensureMapsDir();
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

  const target = path.join(MAPS_DIR, filename);

  try {
    await unlink(target);
    await removeMetadataForMap(filename);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      (error as { code: string }).code === 'ENOENT'
    ) {
      return mapNotFound(filename);
    }
    throw error;
  }

  return new Response(null, { status: 204 });
}
