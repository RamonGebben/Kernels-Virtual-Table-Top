import type { GridSettings } from './messages.js';

export interface MapEntry {
  filename: string;
  name: string;
  size: number; // bytes
  lastModified: number; // epoch ms
  grid?: GridSettings;
}

export interface MapListResponse {
  maps: MapEntry[];
}
