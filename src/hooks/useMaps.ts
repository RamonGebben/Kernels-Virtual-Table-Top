'use client';

import { useCallback, useState } from 'react';
import type { FolderEntry, MapEntry, MapListResponse } from '../../types/maps';
import { BLANK_MAP, BLANK_MAP_ID } from '../../types/session';
import type { MapDescriptor } from '../../types/messages';

const toDescriptor = (entry: MapEntry): MapDescriptor => ({
  id: entry.path,
  name: entry.name,
  filename: entry.path,
  grid: entry.grid,
});

export function useMaps() {
  const [maps, setMaps] = useState<MapDescriptor[]>([BLANK_MAP]);
  const [folders, setFolders] = useState<FolderEntry[]>([]);
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
      setFolders(data.folders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const upload = useCallback(async (file: File, folder?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (folder) form.append('folder', folder);
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
    if (folder) {
      setFolders(prev =>
        prev.map(f =>
          f.name === folder ? { ...f, itemCount: f.itemCount + 1 } : f,
        ),
      );
    }
    return descriptor;
  }, []);

  const deleteMap = useCallback(async (mapPath: string) => {
    const res = await fetch('/api/maps', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: mapPath }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Delete failed');
    }
    setMaps(prev => prev.filter(m => m.id !== mapPath));
    const folder = mapPath.includes('/') ? mapPath.split('/')[0] : null;
    if (folder) {
      setFolders(prev =>
        prev.map(f =>
          f.name === folder ? { ...f, itemCount: Math.max(0, f.itemCount - 1) } : f,
        ),
      );
    }
  }, []);

  const moveMap = useCallback(
    async (mapPath: string, targetFolder: string | null) => {
      const res = await fetch('/api/maps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: mapPath, targetFolder }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Move failed');
      }
      await refresh();
    },
    [refresh],
  );

  const createFolder = useCallback(async (name: string) => {
    const res = await fetch('/api/maps/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Create folder failed');
    }
    const folder = (await res.json()) as FolderEntry;
    setFolders(prev => [...prev, folder]);
    return folder;
  }, []);

  const renameFolder = useCallback(async (name: string, newName: string) => {
    const res = await fetch('/api/maps/folders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, newName }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Rename failed');
    }
    await refresh();
  }, [refresh]);

  const deleteFolder = useCallback(async (name: string) => {
    const res = await fetch('/api/maps/folders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Delete folder failed');
    }
    setFolders(prev => prev.filter(f => f.name !== name));
  }, []);

  return {
    maps,
    folders,
    loading,
    error,
    refresh,
    upload,
    deleteMap,
    moveMap,
    createFolder,
    renameFolder,
    deleteFolder,
  };
}

export default useMaps;
