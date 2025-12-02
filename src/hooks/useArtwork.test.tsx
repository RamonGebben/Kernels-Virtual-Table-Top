import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useArtwork } from './useArtwork';

const artworkEntry = {
  filename: 'painting.png',
  name: 'Painting',
};

describe('useArtwork', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refresh loads artwork entries', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ maps: [artworkEntry] }), { status: 200 }),
    );

    const { result } = renderHook(() => useArtwork());

    await act(async () => {
      await result.current.refresh();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/artwork');
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.artwork[0]).toMatchObject({
      id: 'painting.png',
      name: 'Painting',
      filename: 'painting.png',
    });
  });

  it('surfaces an error when refresh fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('nope', { status: 500 }),
    );
    const { result } = renderHook(() => useArtwork());

    await act(async () => {
      await expect(result.current.refresh()).rejects.toThrowError();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error ?? '').toContain('Failed to load artwork');
  });

  it('uploads artwork and prepends it to the list', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ filename: 'portrait.png', name: 'Portrait' }),
        { status: 200 },
      ),
    );
    const file = new File(['file'], 'portrait.png', { type: 'image/png' });
    const { result } = renderHook(() => useArtwork());

    await act(async () => {
      await result.current.upload(file);
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/artwork',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.artwork[0]).toMatchObject({
      id: 'portrait.png',
      filename: 'portrait.png',
      name: 'Portrait',
    });
  });
});
