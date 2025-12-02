import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

const importMetadataModule = async () => {
  vi.resetModules();
  return import('./mapMetadata');
};

describe('mapMetadata helpers', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'map-meta-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('persists and returns grid settings for a map file', async () => {
    const { setGridForMap, getGridForMap, removeMetadataForMap } =
      await importMetadataModule();

    await setGridForMap('forest.png', { size: 48, origin: { x: 5, y: 6 } });
    expect(await getGridForMap('forest.png')).toEqual({
      size: 48,
      origin: { x: 5, y: 6 },
    });

    await removeMetadataForMap('forest.png');
    expect(await getGridForMap('forest.png')).toBeUndefined();
  });

  it('returns empty metadata when file contents are invalid JSON', async () => {
    const mapsDir = path.join(tmpDir, 'maps');
    await mkdir(mapsDir, { recursive: true });
    await writeFile(path.join(mapsDir, 'metadata.json'), '{bad json');

    const { readMetadata } = await importMetadataModule();
    const metadata = await readMetadata();

    expect(metadata).toEqual({});
  });
});
