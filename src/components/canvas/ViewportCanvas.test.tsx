/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, beforeAll, afterEach, vi } from 'vitest';
import { ViewportCanvas } from './ViewportCanvas';

const baseGrid = { size: 48, opacity: 0.2 };
const blankMap = { id: 'blank', name: 'Blank', filename: '' };

const noopContext = () => ({
  save: () => {},
  restore: () => {},
  scale: () => {},
  translate: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  rect: () => {},
  fillRect: () => {},
  arc: () => {},
  setLineDash: () => {},
  drawImage: () => {},
  resetTransform: () => {},
  fill: () => {},
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
});

beforeAll(() => {
  if (!globalThis.PointerEvent) {
    class PointerEventPolyfill extends Event {
      clientX: number;
      clientY: number;
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.clientX = init.clientX ?? 0;
        this.clientY = init.clientY ?? 0;
        this.pointerId = init.pointerId ?? 1;
      }
    }
    // @ts-expect-error assign polyfill for test environment
    globalThis.PointerEvent = PointerEventPolyfill;
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => noopContext() as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(
    HTMLCanvasElement.prototype,
    'getBoundingClientRect',
  ).mockReturnValue({
    width: 800,
    height: 600,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    toJSON: () => ({}),
    x: 0,
    y: 0,
  });
  (HTMLCanvasElement.prototype as any).setPointerCapture = () => {};
  (HTMLCanvasElement.prototype as any).releasePointerCapture = () => {};
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ViewportCanvas', () => {
  it('emits viewport changes when dragging the map', () => {
    const onViewportChange = vi.fn();
    const { getByLabelText } = render(
      <ViewportCanvas
        grid={baseGrid}
        map={blankMap}
        viewport={{ x: 0, y: 0, zoom: 1 }}
        interactive
        onViewportChange={onViewportChange}
      />,
    );

    const canvas = getByLabelText('Viewport canvas');

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 130, pointerId: 1 });

    expect(onViewportChange).toHaveBeenCalled();
    const lastCall = onViewportChange.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ zoom: 1 });
    expect(lastCall?.x).toBeCloseTo(-50);
    expect(lastCall?.y).toBeCloseTo(-30);
  });

  it('routes calibration clicks and previews when calibration is active', () => {
    const onCalibrateClick = vi.fn();
    const onCalibratePreview = vi.fn();
    const { getByLabelText } = render(
      <ViewportCanvas
        grid={baseGrid}
        map={blankMap}
        viewport={{ x: 0, y: 0, zoom: 1 }}
        interactive
        calibrationActive
        onCalibrateClick={onCalibrateClick}
        onCalibratePreview={onCalibratePreview}
      />,
    );

    const canvas = getByLabelText('Viewport canvas');
    fireEvent.pointerDown(canvas, { clientX: 20, clientY: 30, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 25, clientY: 35, pointerId: 1 });

    expect(onCalibrateClick).toHaveBeenCalledWith({ x: 20, y: 30 });
    expect(onCalibratePreview).toHaveBeenCalledWith({ x: 25, y: 35 });
  });

  it('zooms around the cursor and reports the new viewport', () => {
    const onViewportChange = vi.fn();
    const { getByLabelText } = render(
      <ViewportCanvas
        grid={baseGrid}
        map={blankMap}
        viewport={{ x: 0, y: 0, zoom: 1 }}
        interactive
        onViewportChange={onViewportChange}
      />,
    );

    const canvas = getByLabelText('Viewport canvas');
    fireEvent.wheel(canvas, { clientX: 100, clientY: 100, deltaY: -100 });

    expect(onViewportChange).toHaveBeenCalled();
    const nextViewport = onViewportChange.mock.calls.at(-1)?.[0];
    expect(nextViewport?.zoom).toBeGreaterThan(1);
  });
});
