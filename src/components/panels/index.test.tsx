import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PanelKey } from '@/state';
import Panel from './index';

vi.mock('./Maps', () => ({
  default: ({ activeMapId }: { activeMapId: string }) => (
    <div>Maps Panel {activeMapId}</div>
  ),
}));

vi.mock('./Artwork', () => ({
  default: ({ activeArtworkId }: { activeArtworkId?: string }) => (
    <div>Artwork Panel {activeArtworkId}</div>
  ),
}));

vi.mock('./Settings', () => ({
  default: (props: { gridSize: number }) => <div>Settings Panel {props.gridSize}</div>,
}));

vi.mock('./Fog', () => ({
  default: (props: { fog: { enabled: boolean } }) => (
    <div>Fog Panel {props.fog.enabled ? 'on' : 'off'}</div>
  ),
}));

vi.mock('./Initiative', () => ({
  default: (props: { improvedInitiative: { enabled: boolean } }) => (
    <div>
      Initiative Panel {props.improvedInitiative.enabled ? 'on' : 'off'}
    </div>
  ),
}));

const baseProps = {
  activeMapId: 'map-1',
  onSelectMap: vi.fn(),
  activeArtworkId: 'art-1',
  onShowArtwork: vi.fn(),
  gridSize: 48,
  gridVisible: true,
  onGridSizeChange: vi.fn(),
  onGridColorChange: vi.fn(),
  onBackgroundColorChange: vi.fn(),
  onToggleGrid: vi.fn(),
  onStartCalibration: vi.fn(),
  calibrationActive: false,
  improvedInitiative: {
    enabled: false,
    sessionId: '',
    location: 'top-right' as const,
    size: 'medium' as const,
    opacity: 0.75,
  },
  onImprovedInitiativeChange: vi.fn(),
  fog: {
    enabled: true,
    opacityDm: 0.6,
    opacityTable: 0.9,
    strokes: [],
  },
  fogBrushActive: false,
  fogBrushSize: 120,
  fogBrushSoftness: 0.5,
  fogBrushShape: 'circle' as const,
  fogBrushMode: 'reveal' as const,
  onFogToggle: vi.fn(),
  onFogReset: vi.fn(),
  onFogRevealAll: vi.fn(),
  onFogBrushToggle: vi.fn(),
  onFogBrushSizeChange: vi.fn(),
  onFogBrushSoftnessChange: vi.fn(),
  onFogBrushShapeChange: vi.fn(),
  onFogBrushModeChange: vi.fn(),
  onFogOpacityChange: vi.fn(),
};

describe('Panel', () => {
  it.each<PanelKey>(['maps', 'artwork', 'fog', 'initiative', 'settings'])(
    'renders the %s panel',
    activePanel => {
      render(
        <Panel
          {...baseProps}
          activePanel={activePanel}
          gridColor="#fff"
          backgroundColor="#000"
        />,
      );

      expect(
        screen.getByText(new RegExp(`${activePanel} panel`, 'i')),
      ).toBeInTheDocument();
    },
  );

  it('returns null for unsupported panels', () => {
    const { container } = render(
      <Panel
        {...baseProps}
        activePanel={null}
        gridColor="#fff"
        backgroundColor="#000"
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
