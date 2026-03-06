'use client';

import type { PanelKey } from '@/state';
import type { MapDescriptor } from '../../../types/messages';
import type {
  FogBrushShape,
  FogStrokeMode,
  SessionState,
} from '../../../types/session';
import ArtworkPanel from './Artwork';
import FogPanel from './Fog';
import InitiativePanel from './Initiative';
import MapsPanel from './Maps';
import SettingsPanel from './Settings';

interface PanelProps {
  activePanel: PanelKey;
  activeMapId: string;
  onSelectMap: (map: MapDescriptor) => void;
  activeArtworkId?: string | null;
  onShowArtwork: (artwork: MapDescriptor | null) => void;
  gridSize: number;
  gridVisible: boolean;
  gridColor?: string;
  backgroundColor?: string;
  onGridSizeChange: (value: number) => void;
  onGridColorChange: (value: string) => void;
  onBackgroundColorChange: (value: string) => void;
  onToggleGrid: () => void;
  onStartCalibration: () => void;
  calibrationActive: boolean;
  improvedInitiative: NonNullable<SessionState['improvedInitiative']>;
  onImprovedInitiativeChange: (
    settings: Partial<NonNullable<SessionState['improvedInitiative']>>,
  ) => void;
  fog: NonNullable<SessionState['fog']>;
  fogBrushActive: boolean;
  fogBrushSize: number;
  fogBrushSoftness: number;
  fogBrushShape: FogBrushShape;
  fogBrushMode: FogStrokeMode;
  onFogToggle: (enabled: boolean) => void;
  onFogReset: () => void;
  onFogRevealAll: () => void;
  onFogBrushToggle: (active: boolean) => void;
  onFogBrushSizeChange: (size: number) => void;
  onFogBrushSoftnessChange: (softness: number) => void;
  onFogBrushShapeChange: (shape: FogBrushShape) => void;
  onFogBrushModeChange: (mode: FogStrokeMode) => void;
  onFogOpacityChange: (view: 'dm' | 'table', opacity: number) => void;
}

const Panel = ({
  activePanel,
  activeMapId,
  onSelectMap,
  activeArtworkId,
  onShowArtwork,
  gridSize,
  gridVisible,
  gridColor,
  backgroundColor,
  onGridSizeChange,
  onGridColorChange,
  onBackgroundColorChange,
  onToggleGrid,
  onStartCalibration,
  calibrationActive,
  improvedInitiative,
  onImprovedInitiativeChange,
  fog,
  fogBrushActive,
  fogBrushSize,
  fogBrushSoftness,
  fogBrushShape,
  fogBrushMode,
  onFogToggle,
  onFogReset,
  onFogRevealAll,
  onFogBrushToggle,
  onFogBrushSizeChange,
  onFogBrushSoftnessChange,
  onFogBrushShapeChange,
  onFogBrushModeChange,
  onFogOpacityChange,
}: PanelProps) => {
  switch (activePanel) {
    case 'maps':
      return <MapsPanel activeMapId={activeMapId} onSelect={onSelectMap} />;
    case 'artwork':
      return (
        <ArtworkPanel
          activeArtworkId={activeArtworkId}
          onShow={onShowArtwork}
        />
      );
    case 'fog':
      return (
        <FogPanel
          fog={fog}
          fogBrushActive={fogBrushActive}
          fogBrushSize={fogBrushSize}
          fogBrushSoftness={fogBrushSoftness}
          fogBrushShape={fogBrushShape}
          fogBrushMode={fogBrushMode}
          onFogToggle={onFogToggle}
          onFogReset={onFogReset}
          onFogRevealAll={onFogRevealAll}
          onFogBrushToggle={onFogBrushToggle}
          onFogBrushSizeChange={onFogBrushSizeChange}
          onFogBrushSoftnessChange={onFogBrushSoftnessChange}
          onFogBrushShapeChange={onFogBrushShapeChange}
          onFogBrushModeChange={onFogBrushModeChange}
          onFogOpacityChange={onFogOpacityChange}
        />
      );
    case 'settings':
      return (
        <SettingsPanel
          gridSize={gridSize}
          gridVisible={gridVisible}
          gridColor={gridColor}
          backgroundColor={backgroundColor}
          onGridSizeChange={onGridSizeChange}
          onGridColorChange={onGridColorChange}
          onBackgroundColorChange={onBackgroundColorChange}
          onToggleGrid={onToggleGrid}
          onStartCalibration={onStartCalibration}
          calibrationActive={calibrationActive}
        />
      );
    case 'initiative':
      return (
        <InitiativePanel
          improvedInitiative={improvedInitiative}
          onImprovedInitiativeChange={onImprovedInitiativeChange}
        />
      );
    default:
      return null;
  }
};

export default Panel;
