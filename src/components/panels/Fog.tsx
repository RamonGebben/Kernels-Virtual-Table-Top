'use client';

import styles from '@/app/views.module.css';
import type {
  FogBrushShape,
  FogStrokeMode,
  SessionState,
} from '../../../types/session';
import PanelHeader from './PanelHeader';

interface FogPanelProps {
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

const FogPanel = ({
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
}: FogPanelProps) => (
  <>
    <PanelHeader title="Fog of War" />
    <div className={styles.view__fieldset}>
      <div className={styles['view__input-row']}>
        <label className={styles.view__label} htmlFor="fog-enabled">
          Fog enabled
        </label>
        <div className={styles['view__inline-group']}>
          <input
            id="fog-enabled"
            name="fog-enabled"
            type="checkbox"
            className={styles.view__checkbox}
            checked={fog.enabled}
            onChange={event => onFogToggle(event.target.checked)}
          />
          <span className={styles.view__hint}>
            {fog.enabled ? 'Enabled' : 'Hidden'}
          </span>
        </div>
      </div>
      <div className={styles['view__panel-actions']}>
        <button
          className={styles.view__button}
          type="button"
          disabled={!fog.enabled}
          onClick={() => onFogBrushToggle(!fogBrushActive)}
        >
          {fogBrushActive ? 'Stop brush' : 'Fog brush'}
        </button>
        <button
          className={`${styles.view__button} ${styles['view__button--ghost']}`}
          type="button"
          disabled={!fog.enabled}
          onClick={onFogReset}
        >
          Refill fog
        </button>
        <button
          className={`${styles.view__button} ${styles['view__button--ghost']}`}
          type="button"
          disabled={!fog.enabled && fog.strokes.length === 0}
          onClick={onFogRevealAll}
        >
          Reveal all
        </button>
      </div>
    </div>
    <div className={styles.view__fieldset}>
      <label className={styles.view__label} htmlFor="fog-brush-size">
        Brush radius (px)
      </label>
      <div className={styles['view__input-row']}>
        <input
          id="fog-brush-size"
          name="fog-brush-size"
          type="range"
          min={16}
          max={420}
          step={4}
          value={fogBrushSize}
          onChange={event => onFogBrushSizeChange(Number(event.target.value))}
          disabled={!fog.enabled}
          className={styles.view__range}
        />
        <span className={styles.view__hint}>
          {Math.round(fogBrushSize)} px
        </span>
      </div>
    </div>
    <div className={styles.view__fieldset}>
      <label className={styles.view__label} htmlFor="fog-brush-softness">
        Brush softness
      </label>
      <div className={styles['view__input-row']}>
        <input
          id="fog-brush-softness"
          name="fog-brush-softness"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={fogBrushSoftness}
          onChange={event =>
            onFogBrushSoftnessChange(Number(event.target.value))
          }
          disabled={!fog.enabled}
          className={styles.view__range}
        />
        <span className={styles.view__hint}>
          {Math.round(fogBrushSoftness * 100)}% feather
        </span>
      </div>
    </div>
    <div className={styles.view__fieldset}>
      <label className={styles.view__label} htmlFor="fog-brush-shape">
        Brush shape & mode
      </label>
      <div className={styles['view__inline-group']}>
        <select
          id="fog-brush-shape"
          name="fog-brush-shape"
          className={styles.view__input}
          value={fogBrushShape}
          onChange={event =>
            onFogBrushShapeChange(event.target.value as FogBrushShape)
          }
          disabled={!fog.enabled}
        >
          <option value="circle">Circle</option>
          <option value="square">Square</option>
        </select>
        <select
          id="fog-brush-mode"
          name="fog-brush-mode"
          className={styles.view__input}
          value={fogBrushMode}
          onChange={event =>
            onFogBrushModeChange(event.target.value as FogStrokeMode)
          }
          disabled={!fog.enabled}
        >
          <option value="reveal">Reveal</option>
          <option value="cover">Cover</option>
        </select>
      </div>
    </div>
    <div className={styles.view__fieldset}>
      <label className={styles.view__label} htmlFor="fog-opacity-dm">
        Fog opacity (DM view)
      </label>
      <div className={styles['view__input-row']}>
        <input
          id="fog-opacity-dm"
          name="fog-opacity-dm"
          type="range"
          min={0.2}
          max={1}
          step={0.02}
          value={fog.opacityDm}
          onChange={event =>
            onFogOpacityChange('dm', Number(event.target.value))
          }
          disabled={!fog.enabled}
          className={styles.view__range}
        />
        <span className={styles.view__hint}>
          {Math.round(fog.opacityDm * 100)}%
        </span>
      </div>
    </div>
    <div className={styles.view__fieldset}>
      <label className={styles.view__label} htmlFor="fog-opacity-table">
        Fog opacity (Table view)
      </label>
      <div className={styles['view__input-row']}>
        <input
          id="fog-opacity-table"
          name="fog-opacity-table"
          type="range"
          min={0.2}
          max={1}
          step={0.02}
          value={fog.opacityTable}
          onChange={event =>
            onFogOpacityChange('table', Number(event.target.value))
          }
          disabled={!fog.enabled}
          className={styles.view__range}
        />
        <span className={styles.view__hint}>
          {Math.round(fog.opacityTable * 100)}%
        </span>
      </div>
    </div>
  </>
);

export default FogPanel;
