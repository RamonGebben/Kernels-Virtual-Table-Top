'use client';

import { useCallback, useState } from 'react';
import type { FolderEntry, MapEntry, MapListResponse } from '../../types/maps';
import type { MapDescriptor } from '../../types/messages';

const toDescriptor = (entry: MapEntry): MapDescriptor => ({
  id: entry.path,
  name: entry.name,
  filename: entry.path,
});

export function useArtwork() {
  const [artwork, setArtwork] = useState<MapDescriptor[]>([]);
  const [folders, setFolders] = useState<FolderEntry[]>([]);
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
      setFolders(data.folders ?? []);
      return descriptors;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const upload = useCallback(async (file: File, folder?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (folder) form.append('folder', folder);
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
    if (folder) {
      setFolders(prev =>
        prev.map(f =>
          f.name === folder ? { ...f, itemCount: f.itemCount + 1 } : f,
        ),
      );
    }
    return descriptor;
  }, []);

  const deleteArtwork = useCallback(async (artworkPath: string) => {
    const res = await fetch('/api/artwork', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: artworkPath }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Delete failed');
    }
    setArtwork(prev => prev.filter(a => a.id !== artworkPath));
    const folder = artworkPath.includes('/') ? artworkPath.split('/')[0] : null;
    if (folder) {
      setFolders(prev =>
        prev.map(f =>
          f.name === folder ? { ...f, itemCount: Math.max(0, f.itemCount - 1) } : f,
        ),
      );
    }
  }, []);

  const moveArtwork = useCallback(
    async (artworkPath: string, targetFolder: string | null) => {
      const res = await fetch('/api/artwork', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: artworkPath, targetFolder }),
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
    const res = await fetch('/api/artwork/folders', {
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
    const res = await fetch('/api/artwork/folders', {
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
    const res = await fetch('/api/artwork/folders', {
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
    artwork,
    folders,
    loading,
    error,
    refresh,
    upload,
    deleteArtwork,
    moveArtwork,
    createFolder,
    renameFolder,
    deleteFolder,
    setArtwork,
  };
}

export default useArtwork;
