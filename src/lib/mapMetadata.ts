import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GridSettings } from '../../types/messages.js';

export type MapMetadata = Record<string, { grid?: GridSettings }>;

const resolveMapsDir = () => {
  const cwd = process.cwd();
  const candidates = [cwd, path.resolve(cwd, '..')];
  for (const base of candidates) {
    const dir = path.join(base, 'maps');
    if (existsSync(dir)) return dir;
  }
  return path.join(cwd, 'maps');
};

const MAPS_DIR = resolveMapsDir();
const METADATA_FILE = path.join(MAPS_DIR, 'metadata.json');

const ensureFile = async () => {
  await mkdir(MAPS_DIR, { recursive: true });
  try {
    await readFile(METADATA_FILE, 'utf-8');
  } catch {
    await writeFile(METADATA_FILE, '{}', 'utf-8');
  }
};

export const readMetadata = async (): Promise<MapMetadata> => {
  await ensureFile();
  const raw = await readFile(METADATA_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(raw) as MapMetadata;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const writeMetadata = async (metadata: MapMetadata) => {
  await ensureFile();
  await writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf-8');
};

export const getGridForMap = async (
  filename: string,
): Promise<GridSettings | undefined> => {
  const metadata = await readMetadata();
  return metadata[filename]?.grid;
};

export const setGridForMap = async (filename: string, grid: GridSettings) => {
  const metadata = await readMetadata();
  metadata[filename] = { ...metadata[filename], grid };
  await writeMetadata(metadata);
};

export const removeMetadataForMap = async (mapPath: string) => {
  const metadata = await readMetadata();
  if (metadata[mapPath]) {
    delete metadata[mapPath];
    await writeMetadata(metadata);
  }
};

export const updateMetadataKeyPrefix = async (
  oldPrefix: string,
  newPrefix: string,
) => {
  const metadata = await readMetadata();
  const updated: MapMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (key.startsWith(oldPrefix + '/')) {
      const filename = key.slice(oldPrefix.length + 1);
      updated[`${newPrefix}/${filename}`] = value;
    } else {
      updated[key] = value;
    }
  }
  await writeMetadata(updated);
};
