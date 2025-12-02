// Shared message contracts for DM/Table/WebSocket communication.

export type ClientRole = 'dm' | 'table';

export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface ViewportState {
  x: number; // top-left offset in map coordinates
  y: number;
  zoom: number; // 1 = 100%
  rotation?: number;
}

export interface GridSettings {
  size: number; // pixel distance between grid lines at current zoom=1
  origin?: { x: number; y: number };
  color?: string; // CSS color string
  opacity?: number; // 0-1
  backgroundColor?: string; // canvas background when no map or grid hidden
}

export interface MapDescriptor {
  id: string; // filename or UUID
  name: string; // display name
  filename: string;
  width?: number;
  height?: number;
  grid?: GridSettings;
}

export type ClientToServerMessage =
  | {
      type: 'client-connected';
      role: ClientRole;
      viewport?: ViewportDimensions;
    }
  | { type: 'table-size'; size: ViewportDimensions }
  | {
      type: 'table-viewport-change';
      viewport: ViewportState;
    }
  | { type: 'request-session' }
  | {
      type: 'viewport-change';
      viewport: ViewportState;
    }
  | {
      type: 'grid-update';
      grid: GridSettings;
    }
  | {
      type: 'map-change';
      map: MapDescriptor;
    }
  | {
      type: 'artwork-display';
      artwork?: MapDescriptor | null;
    }
  | { type: 'lock-viewport'; locked: boolean }
  | { type: 'ping'; timestamp: number };

export type ServerToClientMessage =
  | {
      type: 'welcome';
      role: ClientRole;
    }
  | {
      type: 'session-state';
      session: import('./session.js').SessionState;
    }
  | {
      type: 'table-size';
      size: ViewportDimensions;
    }
  | {
      type: 'table-viewport-change';
      viewport: ViewportState;
    }
  | {
      type: 'client-connected';
      role: ClientRole;
      viewport?: ViewportDimensions;
    }
  | {
      type: 'viewport-change';
      viewport: ViewportState;
    }
  | {
      type: 'grid-update';
      grid: GridSettings;
    }
  | {
      type: 'map-change';
      map: MapDescriptor;
    }
  | {
      type: 'artwork-display';
      artwork?: MapDescriptor | null;
    }
  | { type: 'lock-viewport'; locked: boolean }
  | { type: 'pong'; timestamp: number };
