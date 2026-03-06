import type { GridSettings, MapDescriptor } from './messages.js';
import type { ViewportState } from './messages.js';
import type { ViewportDimensions } from './messages.js';

export const BLANK_MAP_ID = 'blank';

export const BLANK_MAP: MapDescriptor = {
  id: BLANK_MAP_ID,
  name: 'Blank',
  filename: '',
};

export type TrackerLocation =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export type TrackerSize = 'small' | 'medium' | 'large';

export type FogBrushShape = 'circle' | 'square';
export type FogStrokeMode = 'reveal' | 'cover';

export interface FogStroke {
  id: string;
  x: number;
  y: number;
  radius: number;
  softness: number; // 0 = hard edge, 1 = fully feathered
  shape: FogBrushShape;
  mode: FogStrokeMode;
}

export interface FogState {
  enabled: boolean;
  opacityDm: number; // 0-1 overlay darkness for DM view
  opacityTable: number; // 0-1 overlay darkness for table view
  strokes: FogStroke[];
}

export type FogUpdate =
  | { kind: 'toggle'; enabled: boolean }
  | { kind: 'reset'; strokes?: FogStroke[] }
  | { kind: 'stroke'; stroke: FogStroke }
  | { kind: 'stroke-batch'; strokes: FogStroke[] }
  | { kind: 'set-opacity'; view: 'dm' | 'table'; opacity: number };

export interface ImprovedInitiativeSettings {
  enabled: boolean;
  sessionId: string;
  location: TrackerLocation;
  size: TrackerSize;
  opacity: number;
  height?: number | null;
}

export interface SessionState {
  grid: GridSettings;
  map: MapDescriptor;
  artwork?: MapDescriptor | null;
  locked?: boolean;
  viewport?: ViewportState;
  tableViewport?: ViewportState;
  tableSize?: ViewportDimensions;
  improvedInitiative?: ImprovedInitiativeSettings;
  fog?: FogState;
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
  improvedInitiative: {
    enabled: false,
    sessionId: '',
    location: 'top-right',
    size: 'medium',
    opacity: 0.75,
    height: null,
  },
  fog: {
    enabled: false,
    opacityDm: 0.6,
    opacityTable: 0.9,
    strokes: [],
  },
};
