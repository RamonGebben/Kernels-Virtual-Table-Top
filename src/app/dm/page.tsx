'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from 'react';
import { useAtom } from 'jotai';
import ViewportCanvas from '@/components/canvas/ViewportCanvas';
import styles from '../views.module.css';
import { useSessionState } from '@/hooks/useSessionState';
import type { MapDescriptor } from '../../../types/messages';
import {
  DEFAULT_SESSION,
  type FogBrushShape,
  type FogStroke,
  type FogStrokeMode,
  type SessionState,
} from '../../../types/session';
import MapIcon from '@/components/icons/MapIcon';
import ArtworkIcon from '@/components/icons/ArtworkIcon';
import SettingsIcon from '@/components/icons/SettingsIcon';
import CloudIcon from '@/components/icons/CloudIcon';
import LightningIcon from '@/components/icons/LightningIcon';
import ArrowLeftIcon from '@/components/icons/ArrowLeftIcon';
import Panel from '@/components/panels';
import { activePanelAtom, calibrationActiveAtom, type PanelKey } from '@/state';

const DMPageInner = () => {
  const {
    session,
    sendMapChange,
    sendViewportChange,
    sendGridUpdate,
    sendTableViewportChange,
    sendArtworkDisplay,
    connectionLost,
    sendImprovedInitiativeSettings,
    sendFogUpdate,
  } = useSessionState('dm');
  const canvasKey = useMemo(() => session.map.id, [session.map.id]);
  const [calibrationActive, setCalibrationActive] = useAtom(
    calibrationActiveAtom,
  );
  const [calibrationStart, setCalibrationStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [calibrationCurrent, setCalibrationCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [gridVisible, setGridVisible] = useState<boolean>(
    () => (session.grid.opacity ?? 0.18) > 0,
  );
  const [fogBrushArmed, setFogBrushArmed] = useState(false);
  const [fogBrushSize, setFogBrushSize] = useState(140);
  const [fogBrushSoftness, setFogBrushSoftness] = useState(0.55);
  const [fogBrushShape, setFogBrushShape] =
    useState<FogBrushShape>('circle');
  const [fogBrushMode, setFogBrushMode] =
    useState<FogStrokeMode>('reveal');
  const [activePanel, setActivePanel] = useAtom(activePanelAtom);
  const previousOpacityRef = useRef<number | null>(null);
  const canvasBg = session.grid.backgroundColor ?? '#0c0d11';
  const improvedInitiative =
    session.improvedInitiative ?? DEFAULT_SESSION.improvedInitiative!;
  const fog = useMemo(
    () => ({
      ...DEFAULT_SESSION.fog!,
      ...(session.fog ?? {}),
      strokes: session.fog?.strokes ?? DEFAULT_SESSION.fog!.strokes,
    }),
    [session.fog],
  );
  const fogBrushActive = fog.enabled && fogBrushArmed;

  const handleSelect = useCallback(
    (map: MapDescriptor) => {
      sendMapChange(map);
    },
    [sendMapChange],
  );

  const handleCalibratePreview = useCallback(
    (point: { x: number; y: number }) => {
      if (!calibrationActive) return;
      setCalibrationCurrent(point);
    },
    [calibrationActive],
  );

  const handleGridSizeChange = useCallback(
    (value: number) => {
      if (Number.isNaN(value) || value <= 0) return;
      sendGridUpdate({ ...session.grid, size: value });
    },
    [sendGridUpdate, session.grid],
  );

  const handleGridColorChange = useCallback(
    (value: string) => {
      sendGridUpdate({ ...session.grid, color: value });
    },
    [sendGridUpdate, session.grid],
  );

  const handleBackgroundColorChange = useCallback(
    (value: string) => {
      sendGridUpdate({ ...session.grid, backgroundColor: value });
    },
    [sendGridUpdate, session.grid],
  );

  const handleImprovedInitiativeChange = useCallback(
    (
      update: Partial<NonNullable<SessionState['improvedInitiative']>>,
    ) => {
      const base =
        session.improvedInitiative ?? DEFAULT_SESSION.improvedInitiative!;
      const next = { ...base, ...update };
      sendImprovedInitiativeSettings(next);
    },
    [sendImprovedInitiativeSettings, session.improvedInitiative],
  );

  const handleFogToggle = useCallback(
    (enabled: boolean) => {
      sendFogUpdate({ kind: 'toggle', enabled });
    },
    [sendFogUpdate],
  );

  const handleFogReset = useCallback(() => {
    sendFogUpdate({ kind: 'reset' });
  }, [sendFogUpdate]);

  const handleFogRevealAll = useCallback(() => {
    sendFogUpdate({ kind: 'toggle', enabled: false });
  }, [sendFogUpdate]);

  const handleFogOpacityChange = useCallback(
    (view: 'dm' | 'table', opacity: number) => {
      sendFogUpdate({ kind: 'set-opacity', view, opacity });
    },
    [sendFogUpdate],
  );

  const handleFogStrokeBatch = useCallback(
    (strokes: FogStroke[]) => {
      sendFogUpdate({ kind: 'stroke-batch', strokes });
    },
    [sendFogUpdate],
  );

  const handleCalibrateClick = useCallback(
    (point: { x: number; y: number }) => {
      if (!calibrationStart) {
        setCalibrationStart(point);
        setCalibrationCurrent(point);
        return;
      }
      // finalize with second point
      const start = calibrationStart;
      const end = point;
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);
      const size =
        width && height
          ? (width + height) / 2
          : width || height || session.grid.size;
      const origin = {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
      };
      sendGridUpdate({ ...session.grid, size, origin });
      setCalibrationActive(false);
      setCalibrationStart(null);
      setCalibrationCurrent(null);
    },
    [
      calibrationStart,
      sendGridUpdate,
      session.grid,
      setCalibrationActive,
      setCalibrationStart,
      setCalibrationCurrent,
    ],
  );

  const handleFogBrushSizeChange = useCallback((size: number) => {
    setFogBrushSize(size);
  }, []);

  const handleFogBrushSoftnessChange = useCallback((softness: number) => {
    setFogBrushSoftness(softness);
  }, []);

  const handleFogBrushShapeChange = useCallback((shape: FogBrushShape) => {
    setFogBrushShape(shape);
  }, []);

  const handleFogBrushModeChange = useCallback((mode: FogStrokeMode) => {
    setFogBrushMode(mode);
  }, []);

  useEffect(() => {
    const visible = (session.grid.opacity ?? 0.18) > 0;
    // Defer setState to avoid synchronous state update inside the effect body.
    const id = window.setTimeout(() => setGridVisible(visible), 0);
    return () => clearTimeout(id);
  }, [session.grid.opacity]);

  const toolbarButtons: {
    key: Exclude<PanelKey, null>;
    label: string;
    icon: JSX.Element;
  }[] = useMemo(
    () => [
      {
        key: 'maps',
        label: 'Maps',
        icon: (
          <MapIcon
            className={styles.view__icon}
            style={{ marginLeft: '-4px' }}
          />
        ),
      },
      {
        key: 'artwork',
        label: 'Artwork',
        icon: (
          <ArtworkIcon
            className={styles.view__icon}
            style={{ marginLeft: '-4px' }}
          />
        ),
      },
      {
        key: 'fog',
        label: 'Fog',
        icon: (
          <CloudIcon
            className={styles.view__icon}
            style={{ marginLeft: '-3px' }}
          />
        ),
      },
      {
        key: 'initiative',
        label: 'Initiative',
        icon: (
          <LightningIcon
            className={styles.view__icon}
            style={{ marginLeft: '-4px' }}
          />
        ),
      },
      {
        key: 'settings',
        label: 'Settings',
        icon: (
          <SettingsIcon
            className={styles.view__icon}
            style={{ marginLeft: '-3px' }}
          />
        ),
      },
    ],
    [],
  );

  const togglePanel = useCallback(
    (panel: Exclude<PanelKey, null>) => {
      // Weird behavior to force animation
      setActivePanel(prev => (prev === panel ? panel : null));
      setTimeout(() => {
        setActivePanel(prev => (prev === panel ? null : panel));
      }, 100);
    },
    [setActivePanel],
  );

  return (
    <main className={`${styles.view} ${styles['view--dm']}`}>
      {connectionLost && (
        <div className={styles.view__toast}>
          Connection lost. Trying to reconnect…
        </div>
      )}

      <div className={styles.view__rail} aria-label="DM panels">
        {toolbarButtons.map(button => {
          const active = activePanel === button.key;
          return (
            <button
              key={button.key}
              type="button"
              className={`${styles.view__button} ${styles['view__rail-button']} ${
                active ? styles['view__rail-button--active'] : ''
              }`}
              onClick={() => togglePanel(button.key)}
              aria-pressed={active}
              aria-label={button.label}
              title={button.label}
            >
              {button.icon}
              <span className={styles['view__rail-label']}>{button.label}</span>
            </button>
          );
        })}
      </div>

      <aside
        className={`${styles.view__drawer} ${
          activePanel ? styles['view__drawer--open'] : ''
        }`}
        aria-hidden={!activePanel}
      >
        {activePanel && (
          <>
            <div className={styles['view__drawer-header']}>
              <button
                className={`${styles.view__button} ${styles.view__collapse}`}
                type="button"
                onClick={() => setActivePanel(null)}
                aria-label="Close panel"
              >
                <ArrowLeftIcon
                  className={styles.view__icon}
                  style={{ marginLeft: '-6px' }}
                />
              </button>
              <span className={styles['view__drawer-title']}>
                {toolbarButtons.find(btn => btn.key === activePanel)?.label}
              </span>
            </div>
            <div className={styles['view__drawer-body']}>
              <Panel
                activePanel={activePanel}
                activeMapId={session.map.id}
                onSelectMap={handleSelect}
                activeArtworkId={session.artwork?.id}
                onShowArtwork={sendArtworkDisplay}
                gridSize={session.grid.size || 48}
                gridVisible={gridVisible}
                gridColor={session.grid.color}
                backgroundColor={session.grid.backgroundColor}
                onGridSizeChange={handleGridSizeChange}
                onGridColorChange={handleGridColorChange}
                onBackgroundColorChange={handleBackgroundColorChange}
                onToggleGrid={() => {
                  if (gridVisible) {
                    previousOpacityRef.current = session.grid.opacity ?? 0.18;
                    setGridVisible(false);
                    sendGridUpdate({ ...session.grid, opacity: 0 });
                  } else {
                    const restored = previousOpacityRef.current ?? 0.18;
                    setGridVisible(true);
                    sendGridUpdate({ ...session.grid, opacity: restored });
                  }
                }}
                onStartCalibration={() => {
                  if (calibrationActive) {
                    setCalibrationActive(false);
                    setCalibrationStart(null);
                    setCalibrationCurrent(null);
                  } else {
                    setCalibrationActive(true);
                  }
                }}
                calibrationActive={calibrationActive}
                improvedInitiative={improvedInitiative}
                onImprovedInitiativeChange={handleImprovedInitiativeChange}
                fog={fog}
                fogBrushActive={fogBrushActive}
                fogBrushSize={fogBrushSize}
                fogBrushSoftness={fogBrushSoftness}
                fogBrushShape={fogBrushShape}
                fogBrushMode={fogBrushMode}
                onFogToggle={handleFogToggle}
                onFogReset={handleFogReset}
                onFogRevealAll={handleFogRevealAll}
                onFogBrushToggle={setFogBrushArmed}
                onFogBrushSizeChange={handleFogBrushSizeChange}
                onFogBrushSoftnessChange={handleFogBrushSoftnessChange}
                onFogBrushShapeChange={handleFogBrushShapeChange}
                onFogBrushModeChange={handleFogBrushModeChange}
                onFogOpacityChange={handleFogOpacityChange}
              />
            </div>
          </>
        )}
      </aside>

      <ViewportCanvas
        grid={session.grid}
        map={session.map}
        key={canvasKey}
        className={`${styles.view__canvas} ${styles['view__canvas--dm']} ${
          calibrationActive ? styles['view__canvas--calibrating'] : ''
        } ${fogBrushActive ? styles['view__canvas--fog-active'] : ''}`}
        viewport={session.viewport}
        interactive
        onViewportChange={sendViewportChange}
        calibrationActive={calibrationActive}
        onCalibrateClick={handleCalibrateClick}
        onCalibratePreview={handleCalibratePreview}
        calibrationStart={calibrationStart}
        calibrationCurrent={calibrationCurrent}
        lensViewport={session.tableViewport}
        lensSize={session.tableSize ?? { width: 1920, height: 1080 }}
        onLensChange={sendTableViewportChange}
        fog={fog}
        fogOpacityOverride={fog.opacityDm}
        fogTool={{
          enabled: fogBrushActive,
          mode: fogBrushMode,
          shape: fogBrushShape,
          size: fogBrushSize,
          softness: fogBrushSoftness,
        }}
        onFogStrokeBatch={handleFogStrokeBatch}
        backgroundColor={canvasBg}
      />
    </main>
  );
};

const DMPage = () => <DMPageInner />;

export default DMPage;
