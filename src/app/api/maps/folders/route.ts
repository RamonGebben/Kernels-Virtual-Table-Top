import { mkdir, readdir, rename, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';

import type { FolderEntry } from '../../../../../types/maps';
import { updateMetadataKeyPrefix } from '../../../../lib/mapMetadata';

export const runtime = 'nodejs';

const MAPS_DIR = path.join(process.cwd(), 'maps');
const FOLDER_NAME_REGEX = /^[\w\-\s]{1,64}$/;

const ensureMapsDir = async () => {
  await mkdir(MAPS_DIR, { recursive: true });
};

const badRequest = (msg: string) =>
  new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });

const validateFolderName = (name: unknown): name is string =>
  typeof name === 'string' && FOLDER_NAME_REGEX.test(name);

export async function POST(request: NextRequest) {
  await ensureMapsDir();
  let name: string;

  try {
    const body = await request.json();
    name = body?.name;
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!validateFolderName(name)) return badRequest('Invalid folder name');

  const folderPath = path.join(MAPS_DIR, name);
  await mkdir(folderPath, { recursive: true });

  const entries = await readdir(folderPath);
  const payload: FolderEntry = { name, itemCount: entries.length };
  return Response.json(payload, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  await ensureMapsDir();
  let name: string;

  try {
    const body = await request.json();
    name = body?.name;
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!validateFolderName(name)) return badRequest('Invalid folder name');

  const folderPath = path.join(MAPS_DIR, name);

  try {
    await rmdir(folderPath);
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'code' in error) {
      const code = (error as { code: string }).code;
      if (code === 'ENOENT') {
        return new Response(JSON.stringify({ error: `Folder not found: ${name}` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (code === 'ENOTEMPTY') {
        return new Response(JSON.stringify({ error: 'Folder is not empty' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    throw error;
  }

  return new Response(null, { status: 204 });
}

export async function PATCH(request: NextRequest) {
  await ensureMapsDir();
  let name: string, newName: string;

  try {
    const body = await request.json();
    name = body?.name;
    newName = body?.newName;
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!validateFolderName(name) || !validateFolderName(newName)) {
    return badRequest('Invalid folder name');
  }

  const oldPath = path.join(MAPS_DIR, name);
  const newPath = path.join(MAPS_DIR, newName);

  try {
    await rename(oldPath, newPath);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      (error as { code: string }).code === 'ENOENT'
    ) {
      return new Response(JSON.stringify({ error: `Folder not found: ${name}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw error;
  }

  await updateMetadataKeyPrefix(name, newName);

  const entries = await readdir(newPath);
  const payload: FolderEntry = { name: newName, itemCount: entries.length };
  return Response.json(payload);
}
