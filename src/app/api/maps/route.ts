import { mkdir, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';

import type { FolderEntry, MapEntry, MapListResponse } from '../../../../types/maps';
import {
  readMetadata,
  removeMetadataForMap,
  writeMetadata,
} from '../../../lib/mapMetadata';

export const runtime = 'nodejs';

const MAPS_DIR = path.join(process.cwd(), 'maps');
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB default cap

const ensureMapsDir = async () => {
  await mkdir(MAPS_DIR, { recursive: true });
};

const MAP_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.webm']);
const FOLDER_NAME_REGEX = /^[\w\-\s]{1,64}$/;
const SEGMENT_REGEX = /^[\w.\-\s]+$/;

const isMapFile = (filename: string) =>
  MAP_EXTENSIONS.has(path.extname(filename).toLowerCase());

const validateMapPath = (mapPath: string): boolean => {
  const segments = mapPath.split('/');
  if (segments.length > 2) return false;
  return segments.every(
    s => s.length > 0 && SEGMENT_REGEX.test(s) && s !== '..',
  );
};

const secureResolve = (base: string, ...segments: string[]): string | null => {
  const resolved = path.resolve(path.join(base, ...segments));
  const baseResolved = path.resolve(base);
  if (
    resolved !== baseResolved &&
    !resolved.startsWith(baseResolved + path.sep)
  )
    return null;
  return resolved;
};

const toEntry = (
  mapPath: string,
  fileStat: Awaited<ReturnType<typeof stat>>,
): MapEntry => {
  const segments = mapPath.split('/');
  const filename = segments[segments.length - 1];
  const folder = segments.length > 1 ? segments[0] : undefined;
  return {
    filename,
    name: path.parse(filename).name,
    folder,
    path: mapPath,
    size: Number(fileStat.size),
    lastModified: Number(fileStat.mtimeMs),
  };
};

// Normalize Windows-style paths before extracting basename
const sanitizeFilename = (filename: string) =>
  path.basename(filename.replace(/\\/g, '/'));

const mapNotFound = (p: string) =>
  new Response(JSON.stringify({ error: `Map not found: ${p}` }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

const badRequest = (msg: string) =>
  new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });

export async function GET() {
  await ensureMapsDir();
  const metadata = await readMetadata();

  const maps: MapEntry[] = [];
  const folderMap = new Map<string, number>();

  const rootEntries = await readdir(MAPS_DIR, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isFile() && isMapFile(entry.name)) {
      const fullPath = path.join(MAPS_DIR, entry.name);
      const fileStat = await stat(fullPath);
      maps.push({ ...toEntry(entry.name, fileStat), grid: metadata[entry.name]?.grid });
    } else if (entry.isDirectory()) {
      const subEntries = await readdir(path.join(MAPS_DIR, entry.name), {
        withFileTypes: true,
      });
      let count = 0;
      for (const sub of subEntries) {
        if (sub.name.startsWith('.')) continue;
        if (sub.isFile() && isMapFile(sub.name)) {
          count++;
          const mapPath = `${entry.name}/${sub.name}`;
          const fullPath = path.join(MAPS_DIR, entry.name, sub.name);
          const fileStat = await stat(fullPath);
          maps.push({ ...toEntry(mapPath, fileStat), grid: metadata[mapPath]?.grid });
        }
      }
      folderMap.set(entry.name, count);
    }
  }

  const folders: FolderEntry[] = Array.from(folderMap.entries()).map(
    ([name, itemCount]) => ({ name, itemCount }),
  );

  const payload: MapListResponse = { maps, folders };
  return Response.json(payload);
}

export async function POST(request: NextRequest) {
  await ensureMapsDir();
  const metadata = await readMetadata();
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return badRequest('Expected form-data field `file`');
  }

  const folderField = formData.get('folder');
  let folder: string | undefined;
  if (typeof folderField === 'string' && folderField) {
    if (!FOLDER_NAME_REGEX.test(folderField)) return badRequest('Invalid folder name');
    folder = folderField;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return new Response(JSON.stringify({ error: 'File too large' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const filename = sanitizeFilename(file.name);
  const targetDir = folder ? path.join(MAPS_DIR, folder) : MAPS_DIR;
  await mkdir(targetDir, { recursive: true });
  const target = path.join(targetDir, filename);
  await writeFile(target, buffer);

  const fileStat = await stat(target);
  const mapPath = folder ? `${folder}/${filename}` : filename;
  const payload: MapEntry = { ...toEntry(mapPath, fileStat), grid: metadata[mapPath]?.grid };
  return Response.json(payload, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  await ensureMapsDir();
  let mapPath: string | undefined;

  try {
    const body = await request.json();
    mapPath = body?.path;
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!mapPath || !validateMapPath(mapPath)) {
    return badRequest('Missing or invalid `path`');
  }

  const segments = mapPath.split('/');
  const resolved = secureResolve(MAPS_DIR, ...segments);
  if (!resolved) return badRequest('Invalid path');

  try {
    await unlink(resolved);
    await removeMetadataForMap(mapPath);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      (error as { code: string }).code === 'ENOENT'
    ) {
      return mapNotFound(mapPath);
    }
    throw error;
  }

  return new Response(null, { status: 204 });
}

export async function PATCH(request: NextRequest) {
  await ensureMapsDir();
  let mapPath: string, targetFolder: string | null;

  try {
    const body = await request.json();
    mapPath = body?.path;
    targetFolder = body?.targetFolder ?? null;
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!mapPath || !validateMapPath(mapPath)) {
    return badRequest('Missing or invalid `path`');
  }
  if (targetFolder !== null && !FOLDER_NAME_REGEX.test(targetFolder)) {
    return badRequest('Invalid targetFolder');
  }

  const srcSegments = mapPath.split('/');
  const filename = srcSegments[srcSegments.length - 1];
  const srcResolved = secureResolve(MAPS_DIR, ...srcSegments);
  if (!srcResolved) return badRequest('Invalid path');

  const destDir = targetFolder ? path.join(MAPS_DIR, targetFolder) : MAPS_DIR;
  const destResolved = secureResolve(destDir, filename);
  if (!destResolved) return badRequest('Invalid destination');

  await mkdir(destDir, { recursive: true });

  try {
    await rename(srcResolved, destResolved);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      (error as { code: string }).code === 'ENOENT'
    ) {
      return mapNotFound(mapPath);
    }
    throw error;
  }

  const newMapPath = targetFolder ? `${targetFolder}/${filename}` : filename;
  const metadata = await readMetadata();
  if (metadata[mapPath]) {
    metadata[newMapPath] = metadata[mapPath];
    delete metadata[mapPath];
    await writeMetadata(metadata);
  }

  const fileStat = await stat(destResolved);
  const payload: MapEntry = {
    ...toEntry(newMapPath, fileStat),
    grid: metadata[newMapPath]?.grid,
  };
  return Response.json(payload);
}
