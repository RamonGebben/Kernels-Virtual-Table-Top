import type { GridSettings } from './messages.js';

export interface MapEntry {
  filename: string; // bare filename only (no folder prefix)
  name: string; // filename without extension
  folder?: string; // folder name; undefined = root
  path: string; // "folder/filename" or "filename" for root
  size: number; // bytes
  lastModified: number; // epoch ms
  grid?: GridSettings;
}

export interface FolderEntry {
  name: string;
  itemCount: number;
}

export interface MapListResponse {
  maps: MapEntry[];
  folders: FolderEntry[];
}
