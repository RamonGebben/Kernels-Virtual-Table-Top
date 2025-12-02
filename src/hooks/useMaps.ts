'use client';

import { useCallback, useState } from 'react';
import type { MapEntry, MapListResponse } from '../../types/maps';
import { BLANK_MAP, BLANK_MAP_ID } from '../../types/session';
import type { MapDescriptor } from '../../types/messages';

const toDescriptor = (entry: MapEntry): MapDescriptor => ({
  id: entry.filename,
  name: entry.name,
  filename: entry.filename,
  grid: entry.grid,
});

export function useMaps() {
  const [maps, setMaps] = useState<MapDescriptor[]>([BLANK_MAP]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/maps');
      if (!res.ok) {
        throw new Error(`Failed to load maps (${res.status})`);
      }
      const data = (await res.json()) as MapListResponse;
      const descriptors = data.maps.map(toDescriptor);
      setMaps([BLANK_MAP, ...descriptors]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const upload = useCallback(async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/maps', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Upload failed');
    }
    const entry = (await res.json()) as MapEntry;
    const descriptor = toDescriptor(entry);
    setMaps(prev => {
      const existing = prev.filter(
        m => m.id !== descriptor.id && m.id !== BLANK_MAP_ID,
      );
      return [BLANK_MAP, descriptor, ...existing];
    });
    return descriptor;
  }, []);

  return { maps, loading, error, refresh, upload };
}

export default useMaps;
