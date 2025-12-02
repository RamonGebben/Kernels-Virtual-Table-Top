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
  default: ({ gridSize }: { gridSize: number }) => (
    <div>Settings Panel {gridSize}</div>
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
};

describe('Panel', () => {
  it.each<PanelKey>(['maps', 'artwork', 'settings'])(
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
