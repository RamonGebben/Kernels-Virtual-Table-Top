'use client';

import { useEffect, useMemo, useRef } from 'react';
import type {
  GridSettings,
  MapDescriptor,
  ViewportState,
} from '../../../types/messages';
import { BLANK_MAP_ID } from '../../../types/session';
import type {
  FogBrushShape,
  FogState,
  FogStroke,
  FogStrokeMode,
} from '../../../types/session';

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
  fog?: FogState;
  fogOpacityOverride?: number;
  staticVideo?: boolean;
  fogTool?: {
    enabled: boolean;
    mode: FogStrokeMode;
    shape: FogBrushShape;
    size: number; // radius in map pixels
    softness: number; // 0-1 feathering
  };
  onFogStrokeBatch?: (strokes: FogStroke[]) => void;
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

const makeStrokeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const drawFogStroke = (ctx: CanvasRenderingContext2D, stroke: FogStroke) => {
  ctx.save();
  ctx.globalCompositeOperation =
    stroke.mode === 'reveal' ? 'destination-out' : 'source-over';

  if (stroke.shape === 'circle') {
    const innerRadius = Math.max(
      0,
      stroke.radius * Math.max(0, 1 - stroke.softness),
    );
    const gradient = ctx.createRadialGradient(
      stroke.x,
      stroke.y,
      innerRadius,
      stroke.x,
      stroke.y,
      stroke.radius,
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(stroke.x, stroke.y, stroke.radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(
      stroke.x - stroke.radius,
      stroke.y - stroke.radius,
      stroke.radius * 2,
      stroke.radius * 2,
    );
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
  fog,
  fogOpacityOverride,
  staticVideo,
  fogTool,
  onFogStrokeBatch,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const staticFrameRef = useRef<HTMLCanvasElement | null>(null);
  const mapKeyRef = useRef<string | null>(null);

  // State refs
  const viewportRef = useRef<ViewportState | undefined>(viewport);
  const lensViewportRef = useRef<ViewportState | null | undefined>(
    lensViewport,
  );
  const lensSizeRef = useRef<
    { width: number; height: number } | null | undefined
  >(lensSize);
  const fogRef = useRef<FogState | undefined>(fog);
  const fogToolRef = useRef<Props['fogTool']>(fogTool);
  const onFogStrokeBatchRef =
    useRef<Props['onFogStrokeBatch']>(onFogStrokeBatch);
  const pendingFogStrokesRef = useRef<FogStroke[]>([]);
  const fogMaskRef = useRef<HTMLCanvasElement | null>(null);
  const fogMaskCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const fogDirtyRef = useRef<boolean>(true);
  const mapSizeRef = useRef<{ width: number; height: number }>({
    width: 1920,
    height: 1080,
  });

  // Cursor tracking for brush preview
  const cursorMapPosRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRectRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const rafIdRef = useRef<number>(0);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const videoLoadingRef = useRef<boolean>(false);
  const videoLoadProgressRef = useRef<number>(0);
  const videoAnimCancelRef = useRef<(() => void) | null>(null);

  // Interaction refs
  const dragModeRef = useRef<'dm' | 'lens' | 'fog' | null>(null);
  const startPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startViewportRef = useRef<ViewportState | null>(null);
  const lensDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const lensViewportStartRef = useRef<ViewportState | null>(null);

  // Callback refs
  const drawRef = useRef<() => void>(() => {});
  const scheduleDraw = useMemo(
    () => () => {
      if (rafIdRef.current !== 0) return;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = 0;
        drawRef.current();
      });
    },
    [],
  );
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
    return `/api/maps/${map.filename}`;
  }, [map]);

  const rebuildFogMask = () => {
    const fogState = fogRef.current;
    const { width, height } = mapSizeRef.current;
    if (!fogState?.enabled || width <= 0 || height <= 0) {
      fogMaskRef.current = null;
      fogDirtyRef.current = false;
      return;
    }

    let canvas = fogMaskRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      fogMaskRef.current = canvas;
      fogMaskCtxRef.current = canvas.getContext('2d');
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = fogMaskCtxRef.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, width, height);

    for (const stroke of fogState.strokes) {
      drawFogStroke(ctx, stroke);
    }

    fogDirtyRef.current = false;
  };

  // Keep refs in sync with props
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    lensViewportRef.current = lensViewport;
    scheduleDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lensViewport]);

  useEffect(() => {
    lensSizeRef.current = lensSize;
    scheduleDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lensSize]);

  useEffect(() => {
    fogRef.current = fog;
    fogDirtyRef.current = true;
    scheduleDraw();
  }, [fog, scheduleDraw]);

  useEffect(() => {
    fogToolRef.current = fogTool;
  }, [fogTool]);

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
    onFogStrokeBatchRef.current = onFogStrokeBatch;
  }, [onFogStrokeBatch]);

  useEffect(() => {
    // Redraw when external viewport updates (e.g., table viewport pushed from DM).
    scheduleDraw();
  }, [viewport, scheduleDraw]);

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
      if (!ctxRef.current) ctxRef.current = canvas.getContext('2d');
      const ctx = ctxRef.current;
      if (!ctx) return;

      const rect = canvasRectRef.current;
      const dpr = window.devicePixelRatio || 1;
      const newW = Math.round(rect.width * dpr);
      const newH = Math.round(rect.height * dpr);
      if (canvas.width !== newW || canvas.height !== newH) {
        canvas.width = newW;
        canvas.height = newH;
      }
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      const currentViewport = viewportRef.current ?? { x: 0, y: 0, zoom: 1 };
      const currentMapWidth =
        videoRef.current?.videoWidth ??
        staticFrameRef.current?.width ??
        imageRef.current?.naturalWidth ??
        map.width ??
        mapSizeRef.current.width;
      const currentMapHeight =
        videoRef.current?.videoHeight ??
        staticFrameRef.current?.height ??
        imageRef.current?.naturalHeight ??
        map.height ??
        mapSizeRef.current.height;

      if (
        currentMapWidth !== mapSizeRef.current.width ||
        currentMapHeight !== mapSizeRef.current.height
      ) {
        mapSizeRef.current = {
          width: currentMapWidth,
          height: currentMapHeight,
        };
        fogDirtyRef.current = true;
      }

      ctx.fillStyle = backgroundColor ?? DEFAULT_BACKGROUND;
      ctx.fillRect(0, 0, rect.width, rect.height);

      const mediaEl: CanvasImageSource | null =
        videoRef.current ?? staticFrameRef.current ?? imageRef.current;
      ctx.save();
      ctx.scale(currentViewport.zoom, currentViewport.zoom);
      ctx.translate(-currentViewport.x, -currentViewport.y);
      if (mediaEl) {
        ctx.drawImage(mediaEl, 0, 0);
      }
      if (gridVisibleRef.current) {
        drawGrid(ctx, currentViewport, rect.width, rect.height, grid);
      }

      if (fogDirtyRef.current) {
        rebuildFogMask();
        const pending = pendingFogStrokesRef.current;
        if (pending.length > 0 && fogMaskCtxRef.current) {
          for (const s of pending) drawFogStroke(fogMaskCtxRef.current, s);
        }
      }

      const fogState = fogRef.current;
      if (fogState?.enabled && fogMaskRef.current) {
        ctx.save();
        ctx.globalAlpha =
          typeof fogOpacityOverride === 'number'
            ? fogOpacityOverride
            : (fogState.opacityDm ?? fogState.opacityTable ?? 0.8);
        ctx.drawImage(fogMaskRef.current, 0, 0);
        ctx.restore();
      }

      const fogToolPrev = fogToolRef.current;
      const cursorPos = cursorMapPosRef.current;
      if (fogToolPrev?.enabled && cursorPos) {
        const zoom = currentViewport.zoom || 1;
        const isReveal = fogToolPrev.mode === 'reveal';

        ctx.save();
        ctx.strokeStyle = isReveal
          ? 'rgba(255, 255, 255, 0.85)'
          : 'rgba(30, 30, 30, 0.85)';
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([4 / zoom, 3 / zoom]);

        if (fogToolPrev.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(cursorPos.x, cursorPos.y, fogToolPrev.size, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeRect(
            cursorPos.x - fogToolPrev.size,
            cursorPos.y - fogToolPrev.size,
            fogToolPrev.size * 2,
            fogToolPrev.size * 2,
          );
        }
        ctx.setLineDash([]);

        ctx.globalAlpha = 0.12;
        ctx.fillStyle = isReveal
          ? 'rgba(255, 255, 255, 1)'
          : 'rgba(0, 0, 0, 1)';
        if (fogToolPrev.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(cursorPos.x, cursorPos.y, fogToolPrev.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(
            cursorPos.x - fogToolPrev.size,
            cursorPos.y - fogToolPrev.size,
            fogToolPrev.size * 2,
            fogToolPrev.size * 2,
          );
        }
        ctx.restore();
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

      // Loading overlay for videos being fetched
      if (videoLoadingRef.current) {
        const progress = videoLoadProgressRef.current;
        const barW = Math.min(rect.width * 0.5, 280);
        const barH = 3;
        const barX = (rect.width - barW) / 2;
        const barY = rect.height / 2 + 24;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          progress > 0 ? `Loading map… ${Math.round(progress * 100)}%` : 'Loading map…',
          rect.width / 2,
          rect.height / 2,
        );

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(barX, barY, barW, barH);
        if (progress > 0) {
          ctx.fillStyle = 'rgba(111, 167, 255, 0.85)';
          ctx.fillRect(barX, barY, barW * progress, barH);
        }
      }

      // Video animation is driven by its own loop (requestVideoFrameCallback
      // or a dedicated RAF) started in the image/video loading effect.
    };

    drawRef.current = drawScene;
    drawScene();
  }, [
    backgroundColor,
    calibrationActive,
    calibrationCurrent,
    calibrationStart,
    grid,
    map,
    fogOpacityOverride,
    scheduleDraw,
  ]);

  // Resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        canvasRectRef.current = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        };
      }
      scheduleDraw();
    });
    resizeObserver.observe(canvas);
    // Seed initial rect synchronously so the first draw has correct dimensions
    const initialRect = canvas.getBoundingClientRect();
    canvasRectRef.current = {
      width: initialRect.width,
      height: initialRect.height,
    };
    scheduleDraw();
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    };
  }, [scheduleDraw]);

  // Image/video loading
  useEffect(() => {
    if (!mapUrl || map.id === BLANK_MAP_ID) {
      imageRef.current = null;
      videoRef.current = null;
      staticFrameRef.current = null;
      mapKeyRef.current = map.id;
      mapSizeRef.current = {
        width: map.width ?? 1920,
        height: map.height ?? 1080,
      };
      fogDirtyRef.current = true;
      scheduleDraw();
      return;
    }

    const key = map.id ?? map.filename;
    mapKeyRef.current = key;
    const isVideo = /\.webm$/i.test(map.filename ?? '');

    let abortController: AbortController | null = null;
    let blobUrl = '';

    if (isVideo) {
      const centerAndDraw = (video: HTMLVideoElement) => {
        if (mapKeyRef.current !== key) return;
        const w = video.videoWidth;
        const h = video.videoHeight;
        mapSizeRef.current = { width: w, height: h };
        fogDirtyRef.current = true;
        if (canvasRef.current) {
          const rect = canvasRectRef.current;
          const fitZoom = Math.min(rect.width / w, rect.height / h);
          const initialZoom = viewportRef.current?.zoom ?? fitZoom;
          const viewWidth = rect.width / initialZoom;
          const viewHeight = rect.height / initialZoom;
          const centered: ViewportState = {
            x: (w - viewWidth) / 2,
            y: (h - viewHeight) / 2,
            zoom: initialZoom,
          };
          viewportRef.current = centered;
          onViewportChangeRef.current?.(centered);
        }
        scheduleDraw();
      };

      // Fetch the whole video as a blob so the browser never stalls mid-playback.
      // Progress is tracked so the canvas can show a loading bar.
      videoLoadingRef.current = true;
      videoLoadProgressRef.current = 0;
      scheduleDraw();

      abortController = new AbortController();

      const fetchBlob = async () => {
        const res = await fetch(mapUrl, { signal: abortController!.signal });
        const contentLength = res.headers.get('Content-Length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        let blob: Blob;
        if (total > 0 && res.body) {
          const reader = res.body.getReader();
          const chunks: Uint8Array<ArrayBuffer>[] = [];
          let loaded = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            loaded += value.byteLength;
            videoLoadProgressRef.current = loaded / total;
            scheduleDraw();
          }
          blob = new Blob(chunks, { type: 'video/webm' });
        } else {
          blob = await res.blob();
        }

        if (mapKeyRef.current !== key) return;

        blobUrl = URL.createObjectURL(blob);
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;

        if (staticVideo) {
          video.addEventListener('loadeddata', () => {
            if (mapKeyRef.current !== key) return;
            const offscreen = document.createElement('canvas');
            offscreen.width = video.videoWidth;
            offscreen.height = video.videoHeight;
            offscreen.getContext('2d')?.drawImage(video, 0, 0);
            staticFrameRef.current = offscreen;
            imageRef.current = null;
            videoRef.current = null;
            videoLoadingRef.current = false;
            centerAndDraw(video);
          });
        } else {
          video.loop = true;
          video.addEventListener('loadedmetadata', () => {
            if (mapKeyRef.current !== key) return;
            imageRef.current = null;
            videoRef.current = video;
            videoLoadingRef.current = false;
            centerAndDraw(video);
            video.play().catch(() => {});

            // Drive canvas redraws frame-by-frame using requestVideoFrameCallback
            // when available (fires exactly once per decoded video frame), falling
            // back to a plain RAF loop. This is independent of scheduleDraw so the
            // dedup guard can never accidentally starve the video loop.
            videoAnimCancelRef.current?.();
            if ('requestVideoFrameCallback' in video) {
              let rvfcId = 0;
              const onFrame = () => {
                if (videoRef.current !== video) return;
                drawRef.current();
                rvfcId = (video as HTMLVideoElement & {
                  requestVideoFrameCallback: (cb: () => void) => number;
                }).requestVideoFrameCallback(onFrame);
              };
              rvfcId = (video as HTMLVideoElement & {
                requestVideoFrameCallback: (cb: () => void) => number;
              }).requestVideoFrameCallback(onFrame);
              videoAnimCancelRef.current = () => {
                (video as HTMLVideoElement & {
                  cancelVideoFrameCallback: (id: number) => void;
                }).cancelVideoFrameCallback(rvfcId);
              };
            } else {
              let active = true;
              const tick = () => {
                if (!active || videoRef.current !== video) return;
                drawRef.current();
                requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
              videoAnimCancelRef.current = () => { active = false; };
            }
          });
        }

        video.src = blobUrl;
      };

      fetchBlob().catch(() => {
        if (mapKeyRef.current === key) {
          videoLoadingRef.current = false;
          scheduleDraw();
        }
      });
    } else {
      const img = new Image();
      img.onload = () => {
        if (mapKeyRef.current !== key) return;
        imageRef.current = img;
        mapSizeRef.current = {
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
        fogDirtyRef.current = true;
        if (canvasRef.current) {
          const rect = canvasRectRef.current;
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
        scheduleDraw();
      };
      img.onerror = () => {
        if (mapKeyRef.current !== key) return;
        imageRef.current = null;
        mapSizeRef.current = {
          width: map.width ?? 1920,
          height: map.height ?? 1080,
        };
        fogDirtyRef.current = true;
        scheduleDraw();
      };
      img.src = mapUrl;
    }

    return () => {
      if (mapKeyRef.current === key) {
        mapKeyRef.current = null;
      }
      if (isVideo) {
        abortController?.abort();
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        videoLoadingRef.current = false;
        videoAnimCancelRef.current?.();
        videoAnimCancelRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current = null;
      }
      staticFrameRef.current = null;
    };
  }, [
    map.id,
    map.filename,
    map.width,
    map.height,
    mapUrl,
    scheduleDraw,
    staticVideo,
  ]);

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

    const createFogStroke = (mapX: number, mapY: number): FogStroke | null => {
      const tool = fogToolRef.current;
      if (!tool?.enabled || !fogRef.current?.enabled) return null;
      const radius = Math.max(2, tool.size);
      const softness = Math.min(Math.max(tool.softness, 0), 1);
      return {
        id: makeStrokeId(),
        x: mapX,
        y: mapY,
        radius,
        softness,
        shape: tool.shape,
        mode: tool.mode,
      };
    };

    const clampViewport = (vp: ViewportState): ViewportState => vp;

    const handlePointerDown = (event: PointerEvent) => {
      if (calibrationActiveRef.current) {
        const { mapX, mapY } = mapPointFromEvent(event);
        onCalibrateClickRef.current?.({ x: mapX, y: mapY });
        return;
      }

      const start = mapPointFromEvent(event);
      const stroke = createFogStroke(start.mapX, start.mapY);
      if (stroke) {
        dragModeRef.current = 'fog';
        pendingFogStrokesRef.current = [stroke];
        if (fogMaskCtxRef.current) drawFogStroke(fogMaskCtxRef.current, stroke);
        scheduleDraw();
        canvas.setPointerCapture(event.pointerId);
        return;
      }

      const ls = lensSizeRef.current;
      const lv = lensViewportRef.current;
      if (lv && ls && onLensChangeRef.current) {
        const { mapX, mapY } = start;
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
      const { mapX, mapY } = mapPointFromEvent(event);
      cursorMapPosRef.current = { x: mapX, y: mapY };

      if (fogToolRef.current?.enabled) {
        scheduleDraw();
      }

      if (calibrationActiveRef.current) {
        onCalibratePreviewRef.current?.({ x: mapX, y: mapY });
        return;
      }

      if (dragModeRef.current === 'fog') {
        const stroke = createFogStroke(mapX, mapY);
        if (stroke) {
          pendingFogStrokesRef.current.push(stroke);
          if (fogMaskCtxRef.current)
            drawFogStroke(fogMaskCtxRef.current, stroke);
          scheduleDraw();
        }
        return;
      }

      if (dragModeRef.current === 'lens') {
        const ls = lensSizeRef.current;
        const lvStart = lensViewportStartRef.current;
        const start = lensDragStartRef.current;
        if (!ls || !lvStart || !start || !onLensChangeRef.current) return;
        const next: ViewportState = {
          ...lvStart,
          x: lvStart.x + (mapX - start.x),
          y: lvStart.y + (mapY - start.y),
        };
        lensViewportRef.current = next;
        onLensChangeRef.current(next);
        scheduleDraw();
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
        scheduleDraw();
        onViewportChangeRef.current?.(clamped);
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (dragModeRef.current === 'fog') {
        const pending = pendingFogStrokesRef.current;
        if (pending.length > 0) {
          onFogStrokeBatchRef.current?.(pending);
          pendingFogStrokesRef.current = [];
        }
      }
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
          scheduleDraw();
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
      scheduleDraw();
      onViewportChangeRef.current?.(clamped);
    };

    const handlePointerLeave = () => {
      cursorMapPosRef.current = null;
      scheduleDraw();
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [interactive, scheduleDraw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Viewport canvas"
    />
  );
};

export default ViewportCanvas;
