'use client';

import { useCallback, useState } from 'react';
import type { MapEntry, MapListResponse } from '../../types/maps';
import type { MapDescriptor } from '../../types/messages';

const toDescriptor = (entry: MapEntry): MapDescriptor => ({
  id: entry.filename,
  name: entry.name,
  filename: entry.filename,
});

export function useArtwork() {
  const [artwork, setArtwork] = useState<MapDescriptor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/artwork');
      if (!res.ok) {
        throw new Error(`Failed to load artwork (${res.status})`);
      }
      const data = (await res.json()) as MapListResponse;
      const descriptors = data.maps.map(toDescriptor);
      setArtwork(descriptors);
      return descriptors;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const upload = useCallback(async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/artwork', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Upload failed');
    }
    const entry = (await res.json()) as MapEntry;
    const descriptor = toDescriptor(entry);
    setArtwork(prev => {
      const existing = prev.filter(m => m.id !== descriptor.id);
      return [descriptor, ...existing];
    });
    return descriptor;
  }, []);

  return { artwork, loading, error, refresh, upload, setArtwork };
}

export default useArtwork;
