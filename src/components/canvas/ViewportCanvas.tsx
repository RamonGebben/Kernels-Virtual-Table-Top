'use client';

import { useEffect, useMemo, useRef } from 'react';
import type {
  GridSettings,
  MapDescriptor,
  ViewportState,
} from '../../../types/messages';
import { BLANK_MAP_ID } from '../../../types/session';

type Props = {
  grid: GridSettings;
  map: MapDescriptor;
  className?: string;
  backgroundColor?: string;
  viewport?: ViewportState;
  interactive?: boolean;
  onViewportChange?: (viewport: ViewportState) => void;
  onCalibrateClick?: (point: { x: number; y: number }) => void;
  onCalibratePreview?: (point: { x: number; y: number }) => void;
  calibrationActive?: boolean;
  calibrationStart?: { x: number; y: number } | null;
  calibrationCurrent?: { x: number; y: number } | null;
  lensViewport?: ViewportState | null;
  lensSize?: { width: number; height: number } | null;
  onLensChange?: (viewport: ViewportState) => void;
  gridVisible?: boolean;
};

const DEFAULT_BACKGROUND = '#0f1014';

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  canvasWidth: number,
  canvasHeight: number,
  grid: GridSettings,
) => {
  const size = grid.size || 48;
  const originX = grid.origin?.x ?? 0;
  const originY = grid.origin?.y ?? 0;
  const opacity = grid.opacity ?? 0.18;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = grid.color ?? '#e0e5f5';
  ctx.globalAlpha = opacity;

  const viewWidth = canvasWidth / (viewport.zoom || 1);
  const viewHeight = canvasHeight / (viewport.zoom || 1);
  const minX = viewport.x - viewWidth;
  const maxX = viewport.x + viewWidth * 2;
  const minY = viewport.y - viewHeight;
  const maxY = viewport.y + viewHeight * 2;

  const startX = Math.floor((minX - originX) / size) * size + originX;
  const startY = Math.floor((minY - originY) / size) * size + originY;

  for (let x = startX; x <= maxX; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, minY);
    ctx.lineTo(x, maxY);
    ctx.stroke();
  }

  for (let y = startY; y <= maxY; y += size) {
    ctx.beginPath();
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
    ctx.stroke();
  }

  ctx.restore();
};

/**
 * Renders the tabletop canvas and handles grid drawing, calibration overlays,
 * and table lens interactions without committing to React state on every frame.
 */
export const ViewportCanvas = ({
  grid,
  map,
  className,
  backgroundColor,
  viewport,
  interactive,
  gridVisible,
  onViewportChange,
  onCalibrateClick,
  onCalibratePreview,
  calibrationActive,
  calibrationStart,
  calibrationCurrent,
  lensViewport,
  lensSize,
  onLensChange,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const mapKeyRef = useRef<string | null>(null);

  // State refs
  const viewportRef = useRef<ViewportState | undefined>(viewport);
  const lensViewportRef = useRef<ViewportState | null | undefined>(
    lensViewport,
  );
  const lensSizeRef = useRef<
    { width: number; height: number } | null | undefined
  >(lensSize);

  // Interaction refs
  const dragModeRef = useRef<'dm' | 'lens' | null>(null);
  const startPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startViewportRef = useRef<ViewportState | null>(null);
  const lensDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const lensViewportStartRef = useRef<ViewportState | null>(null);

  // Callback refs
  const drawRef = useRef<() => void>(() => {});
  const onViewportChangeRef = useRef(onViewportChange);
  const onCalibrateClickRef = useRef(onCalibrateClick);
  const onCalibratePreviewRef = useRef(onCalibratePreview);
  const onLensChangeRef = useRef(onLensChange);
  const calibrationActiveRef = useRef(!!calibrationActive);
  const calibrationStartRef = useRef(calibrationStart ?? null);
  const calibrationCurrentRef = useRef(calibrationCurrent ?? null);
  const gridVisibleRef = useRef(gridVisible ?? true);

  const mapUrl = useMemo(() => {
    if (!map.filename || map.id === BLANK_MAP_ID) return null;
    return `/api/maps/${encodeURIComponent(map.filename)}`;
  }, [map]);

  // Keep refs in sync with props
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    lensViewportRef.current = lensViewport;
  }, [lensViewport]);

  useEffect(() => {
    lensSizeRef.current = lensSize;
  }, [lensSize]);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    onCalibrateClickRef.current = onCalibrateClick;
  }, [onCalibrateClick]);

  useEffect(() => {
    onCalibratePreviewRef.current = onCalibratePreview;
  }, [onCalibratePreview]);

  useEffect(() => {
    onLensChangeRef.current = onLensChange;
  }, [onLensChange]);

  useEffect(() => {
    // Redraw when external viewport updates (e.g., table viewport pushed from DM).
    drawRef.current();
  }, [viewport]);

  useEffect(() => {
    calibrationActiveRef.current = !!calibrationActive;
    calibrationStartRef.current = calibrationStart ?? null;
    calibrationCurrentRef.current = calibrationCurrent ?? null;
  }, [calibrationActive, calibrationStart, calibrationCurrent]);

  useEffect(() => {
    gridVisibleRef.current = gridVisible ?? true;
  }, [gridVisible]);

  // Draw function
  useEffect(() => {
    const drawScene = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      const currentViewport = viewportRef.current ?? { x: 0, y: 0, zoom: 1 };

      ctx.fillStyle = backgroundColor ?? DEFAULT_BACKGROUND;
      ctx.fillRect(0, 0, rect.width, rect.height);

      const img = imageRef.current;
      ctx.save();
      ctx.scale(currentViewport.zoom, currentViewport.zoom);
      ctx.translate(-currentViewport.x, -currentViewport.y);
      if (img) {
        ctx.drawImage(img, 0, 0);
      }
      if (gridVisibleRef.current) {
        drawGrid(ctx, currentViewport, rect.width, rect.height, grid);
      }

      if (calibrationActiveRef.current && calibrationStartRef.current) {
        const current =
          calibrationCurrentRef.current ?? calibrationStartRef.current;
        const x1 = calibrationStartRef.current.x;
        const y1 = calibrationStartRef.current.y;
        const x2 = current.x;
        const y2 = current.y;
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const top = Math.min(y1, y2);
        const bottom = Math.max(y1, y2);

        ctx.beginPath();
        ctx.rect(left, top, right - left, bottom - top);
        ctx.strokeStyle = 'rgba(111, 167, 255, 0.9)';
        ctx.lineWidth = 1 / (currentViewport.zoom || 1);
        ctx.setLineDash([
          8 / (currentViewport.zoom || 1),
          6 / (currentViewport.zoom || 1),
        ]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(111, 167, 255, 0.08)';
        ctx.fill();

        const drawDot = (px: number, py: number) => {
          ctx.beginPath();
          ctx.arc(px, py, 4 / (currentViewport.zoom || 1), 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(111, 167, 255, 0.9)';
          ctx.fill();
        };
        drawDot(x1, y1);
        if (calibrationCurrentRef.current) {
          drawDot(x2, y2);
        }
      }

      if (lensViewportRef.current && lensSizeRef.current) {
        const lv = lensViewportRef.current;
        const ls = lensSizeRef.current;
        const lensWidth = ls.width / (lv.zoom || 1);
        const lensHeight = ls.height / (lv.zoom || 1);
        ctx.beginPath();
        ctx.rect(lv.x, lv.y, lensWidth, lensHeight);
        ctx.strokeStyle = 'rgba(255, 70, 70, 0.9)';
        ctx.lineWidth = 2 / (currentViewport.zoom || 1);
        ctx.setLineDash([
          10 / (currentViewport.zoom || 1),
          6 / (currentViewport.zoom || 1),
        ]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    };

    drawRef.current = drawScene;
    drawScene();
  }, [
    backgroundColor,
    calibrationActive,
    calibrationCurrent,
    calibrationStart,
    grid,
  ]);

  // Resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeObserver = new ResizeObserver(() => drawRef.current());
    resizeObserver.observe(canvas);
    drawRef.current();
    return () => resizeObserver.disconnect();
  }, []);

  // Image loading
  useEffect(() => {
    if (!mapUrl || map.id === BLANK_MAP_ID) {
      imageRef.current = null;
      mapKeyRef.current = map.id;
      drawRef.current();
      return;
    }

    const key = map.id ?? map.filename;
    mapKeyRef.current = key;
    const img = new Image();
    img.onload = () => {
      if (mapKeyRef.current !== key) return;
      imageRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const fitZoom = Math.min(
          rect.width / img.naturalWidth,
          rect.height / img.naturalHeight,
        );
        const initialZoom = viewportRef.current?.zoom ?? fitZoom;
        const viewWidth = rect.width / initialZoom;
        const viewHeight = rect.height / initialZoom;
        const centered: ViewportState = {
          x: (img.naturalWidth - viewWidth) / 2,
          y: (img.naturalHeight - viewHeight) / 2,
          zoom: initialZoom,
        };
        viewportRef.current = centered;
        onViewportChangeRef.current?.(centered);
      }
      drawRef.current();
    };
    img.onerror = () => {
      if (mapKeyRef.current !== key) return;
      imageRef.current = null;
      drawRef.current();
    };
    img.src = mapUrl;

    return () => {
      if (mapKeyRef.current === key) {
        mapKeyRef.current = null;
      }
    };
  }, [map.id, map.filename, mapUrl]);

  // Interactive controls
  useEffect(() => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mapPointFromEvent = (event: PointerEvent | WheelEvent) => {
      const current = viewportRef.current ?? { x: 0, y: 0, zoom: 1 };
      const rect = canvas.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const mapX = current.x + cursorX / (current.zoom || 1);
      const mapY = current.y + cursorY / (current.zoom || 1);
      return { mapX, mapY, cursorX, cursorY, viewport: current };
    };

    const clampViewport = (vp: ViewportState): ViewportState => vp;

    const handlePointerDown = (event: PointerEvent) => {
      if (calibrationActiveRef.current) {
        const { mapX, mapY } = mapPointFromEvent(event);
        onCalibrateClickRef.current?.({ x: mapX, y: mapY });
        return;
      }

      const ls = lensSizeRef.current;
      const lv = lensViewportRef.current;
      if (lv && ls && onLensChangeRef.current) {
        const { mapX, mapY } = mapPointFromEvent(event);
        const lensWidth = ls.width / (lv.zoom || 1);
        const lensHeight = ls.height / (lv.zoom || 1);
        const inside =
          mapX >= lv.x &&
          mapX <= lv.x + lensWidth &&
          mapY >= lv.y &&
          mapY <= lv.y + lensHeight;
        if (inside) {
          dragModeRef.current = 'lens';
          lensDragStartRef.current = { x: mapX, y: mapY };
          lensViewportStartRef.current = { ...lv };
          canvas.setPointerCapture(event.pointerId);
          return;
        }
      }

      dragModeRef.current = 'dm';
      startPointerRef.current = { x: event.clientX, y: event.clientY };
      startViewportRef.current = viewportRef.current ?? { x: 0, y: 0, zoom: 1 };
      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (calibrationActiveRef.current) {
        const { mapX, mapY } = mapPointFromEvent(event);
        onCalibratePreviewRef.current?.({ x: mapX, y: mapY });
        return;
      }

      if (dragModeRef.current === 'lens') {
        const ls = lensSizeRef.current;
        const lvStart = lensViewportStartRef.current;
        const start = lensDragStartRef.current;
        if (!ls || !lvStart || !start || !onLensChangeRef.current) return;
        const { mapX, mapY } = mapPointFromEvent(event);
        const next: ViewportState = {
          ...lvStart,
          x: lvStart.x + (mapX - start.x),
          y: lvStart.y + (mapY - start.y),
        };
        lensViewportRef.current = next;
        onLensChangeRef.current(next);
        drawRef.current();
        return;
      }

      if (dragModeRef.current === 'dm' && startViewportRef.current) {
        const { x: sx, y: sy, zoom } = startViewportRef.current;
        const dx = (event.clientX - startPointerRef.current.x) / (zoom || 1);
        const dy = (event.clientY - startPointerRef.current.y) / (zoom || 1);
        const next: ViewportState = {
          ...startViewportRef.current,
          x: sx - dx,
          y: sy - dy,
        };
        const clamped = clampViewport(next);
        viewportRef.current = clamped;
        drawRef.current();
        onViewportChangeRef.current?.(clamped);
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      dragModeRef.current = null;
      lensDragStartRef.current = null;
      lensViewportStartRef.current = null;
      startViewportRef.current = null;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const {
        mapX,
        mapY,
        cursorX,
        cursorY,
        viewport: current,
      } = mapPointFromEvent(event);

      const ls = lensSizeRef.current;
      const lv = lensViewportRef.current;
      if (lv && ls && onLensChangeRef.current) {
        const lensWidth = ls.width / (lv.zoom || 1);
        const lensHeight = ls.height / (lv.zoom || 1);
        const inside =
          mapX >= lv.x &&
          mapX <= lv.x + lensWidth &&
          mapY >= lv.y &&
          mapY <= lv.y + lensHeight;
        if (inside) {
          const factor = Math.exp((-event.deltaY || 0) * 0.001);
          const minZoom = 0.1;
          const maxZoom = 5;
          const nextZoom = Math.min(
            maxZoom,
            Math.max(minZoom, (lv.zoom || 1) * factor),
          );
          const nextX = mapX - (mapX - lv.x) * (lv.zoom / nextZoom);
          const nextY = mapY - (mapY - lv.y) * (lv.zoom / nextZoom);
          const next: ViewportState = {
            ...lv,
            zoom: nextZoom,
            x: nextX,
            y: nextY,
          };
          lensViewportRef.current = next;
          onLensChangeRef.current(next);
          drawRef.current();
          return;
        }
      }

      const factor = Math.exp((-event.deltaY || 0) * 0.001);
      const minZoom = 0.1;
      const maxZoom = 5;
      const nextZoom = Math.min(
        maxZoom,
        Math.max(minZoom, current.zoom * factor),
      );
      const nextX = mapX - cursorX / nextZoom;
      const nextY = mapY - cursorY / nextZoom;
      const next: ViewportState = {
        ...current,
        zoom: nextZoom,
        x: nextX,
        y: nextY,
      };
      const clamped = clampViewport(next);
      viewportRef.current = clamped;
      drawRef.current();
      onViewportChangeRef.current?.(clamped);
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Viewport canvas"
    />
  );
};

export default ViewportCanvas;
