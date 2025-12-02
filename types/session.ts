import type { GridSettings, MapDescriptor } from './messages.js';
import type { ViewportState } from './messages.js';
import type { ViewportDimensions } from './messages.js';

export const BLANK_MAP_ID = 'blank';

export const BLANK_MAP: MapDescriptor = {
  id: BLANK_MAP_ID,
  name: 'Blank',
  filename: '',
};

export interface SessionState {
  grid: GridSettings;
  map: MapDescriptor;
  artwork?: MapDescriptor | null;
  locked?: boolean;
  viewport?: ViewportState;
  tableViewport?: ViewportState;
  tableSize?: ViewportDimensions;
}

export const DEFAULT_SESSION: SessionState = {
  grid: {
    size: 48,
    color: '#e0e5f5',
    opacity: 0.18,
    backgroundColor: '#0c0d11',
  },
  map: BLANK_MAP,
  locked: false,
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
  },
  tableViewport: {
    x: 0,
    y: 0,
    zoom: 1,
  },
  tableSize: { width: 1920, height: 1080 },
  artwork: null,
};
