import { mkdir, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';

import type { FolderEntry, MapEntry, MapListResponse } from '../../../../types/maps';

export const runtime = 'nodejs';

const ARTWORK_DIR = path.join(process.cwd(), 'artwork');
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB default cap
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const FOLDER_NAME_REGEX = /^[\w\-\s]{1,64}$/;
const SEGMENT_REGEX = /^[\w.\-\s]+$/;

const ensureArtworkDir = async () => {
  await mkdir(ARTWORK_DIR, { recursive: true });
};

const isImageFile = (filename: string) =>
  IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());

const validateArtworkPath = (artworkPath: string): boolean => {
  const segments = artworkPath.split('/');
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
  artworkPath: string,
  fileStat: Awaited<ReturnType<typeof stat>>,
): MapEntry => {
  const segments = artworkPath.split('/');
  const filename = segments[segments.length - 1];
  const folder = segments.length > 1 ? segments[0] : undefined;
  return {
    filename,
    name: path.parse(filename).name,
    folder,
    path: artworkPath,
    size: Number(fileStat.size),
    lastModified: Number(fileStat.mtimeMs),
  };
};

// Normalize Windows-style paths before extracting basename
const sanitizeFilename = (filename: string) =>
  path.basename(filename.replace(/\\/g, '/'));

const artworkNotFound = (p: string) =>
  new Response(JSON.stringify({ error: `Artwork not found: ${p}` }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

const badRequest = (msg: string) =>
  new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });

export async function GET() {
  await ensureArtworkDir();

  const items: MapEntry[] = [];
  const folderMap = new Map<string, number>();

  const rootEntries = await readdir(ARTWORK_DIR, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isFile() && isImageFile(entry.name)) {
      const fullPath = path.join(ARTWORK_DIR, entry.name);
      const fileStat = await stat(fullPath);
      items.push(toEntry(entry.name, fileStat));
    } else if (entry.isDirectory()) {
      const subEntries = await readdir(path.join(ARTWORK_DIR, entry.name), {
        withFileTypes: true,
      });
      let count = 0;
      for (const sub of subEntries) {
        if (sub.name.startsWith('.')) continue;
        if (sub.isFile() && isImageFile(sub.name)) {
          count++;
          const artworkPath = `${entry.name}/${sub.name}`;
          const fullPath = path.join(ARTWORK_DIR, entry.name, sub.name);
          const fileStat = await stat(fullPath);
          items.push(toEntry(artworkPath, fileStat));
        }
      }
      folderMap.set(entry.name, count);
    }
  }

  const folders: FolderEntry[] = Array.from(folderMap.entries()).map(
    ([name, itemCount]) => ({ name, itemCount }),
  );

  const payload: MapListResponse = { maps: items, folders };
  return Response.json(payload);
}

export async function POST(request: NextRequest) {
  await ensureArtworkDir();
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
  const targetDir = folder ? path.join(ARTWORK_DIR, folder) : ARTWORK_DIR;
  await mkdir(targetDir, { recursive: true });
  const target = path.join(targetDir, filename);
  await writeFile(target, buffer);

  const fileStat = await stat(target);
  const artworkPath = folder ? `${folder}/${filename}` : filename;
  const payload: MapEntry = toEntry(artworkPath, fileStat);
  return Response.json(payload, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  await ensureArtworkDir();
  let artworkPath: string | undefined;

  try {
    const body = await request.json();
    artworkPath = body?.path;
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!artworkPath || !validateArtworkPath(artworkPath)) {
    return badRequest('Missing or invalid `path`');
  }

  const segments = artworkPath.split('/');
  const resolved = secureResolve(ARTWORK_DIR, ...segments);
  if (!resolved) return badRequest('Invalid path');

  try {
    await unlink(resolved);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      (error as { code: string }).code === 'ENOENT'
    ) {
      return artworkNotFound(artworkPath);
    }
    throw error;
  }

  return new Response(null, { status: 204 });
}

export async function PATCH(request: NextRequest) {
  await ensureArtworkDir();
  let artworkPath: string, targetFolder: string | null;

  try {
    const body = await request.json();
    artworkPath = body?.path;
    targetFolder = body?.targetFolder ?? null;
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!artworkPath || !validateArtworkPath(artworkPath)) {
    return badRequest('Missing or invalid `path`');
  }
  if (targetFolder !== null && !FOLDER_NAME_REGEX.test(targetFolder)) {
    return badRequest('Invalid targetFolder');
  }

  const srcSegments = artworkPath.split('/');
  const filename = srcSegments[srcSegments.length - 1];
  const srcResolved = secureResolve(ARTWORK_DIR, ...srcSegments);
  if (!srcResolved) return badRequest('Invalid path');

  const destDir = targetFolder ? path.join(ARTWORK_DIR, targetFolder) : ARTWORK_DIR;
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
      return artworkNotFound(artworkPath);
    }
    throw error;
  }

  const newArtworkPath = targetFolder ? `${targetFolder}/${filename}` : filename;
  const fileStat = await stat(destResolved);
  const payload: MapEntry = toEntry(newArtworkPath, fileStat);
  return Response.json(payload);
}
