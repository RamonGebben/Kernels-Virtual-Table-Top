'use client';

import type { PanelKey } from '@/state';
import type { MapDescriptor } from '../../../types/messages';
import ArtworkPanel from './Artwork';
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
    default:
      return null;
  }
};

export default Panel;
