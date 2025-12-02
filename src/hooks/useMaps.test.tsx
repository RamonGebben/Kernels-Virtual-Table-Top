import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMaps } from './useMaps';
import { BLANK_MAP } from '../../types/session';

const mapEntry = {
  filename: 'forest.png',
  name: 'Forest',
  grid: { size: 50 },
};

describe('useMaps', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refresh loads maps and prepends the blank map', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ maps: [mapEntry] }), { status: 200 }),
    );
    const { result } = renderHook(() => useMaps());

    await act(async () => {
      await result.current.refresh();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/maps');
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.maps[0]).toEqual(BLANK_MAP);
    expect(result.current.maps[1]).toMatchObject({
      id: mapEntry.filename,
      name: mapEntry.name,
      filename: mapEntry.filename,
    });
  });

  it('surfaces an error when refresh fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('nope', { status: 500 }),
    );
    const { result } = renderHook(() => useMaps());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.maps).toHaveLength(1);
    expect(result.current.error).toContain('Failed to load maps');
  });

  it('uploads a map and keeps blank map at the front', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ filename: 'cave.png', name: 'Cave', grid: null }),
        { status: 200 },
      ),
    );
    const file = new File(['file'], 'cave.png', { type: 'image/png' });
    const { result } = renderHook(() => useMaps());

    await act(async () => {
      await result.current.upload(file);
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/maps',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.maps[0]).toEqual(BLANK_MAP);
    expect(result.current.maps[1]).toMatchObject({
      id: 'cave.png',
      name: 'Cave',
      filename: 'cave.png',
    });
  });
});
