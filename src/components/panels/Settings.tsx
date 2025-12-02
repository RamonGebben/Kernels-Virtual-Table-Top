'use client';

import styles from '@/app/views.module.css';
import PanelHeader from './PanelHeader';

interface SettingsPanelProps {
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

const SettingsPanel = ({
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
}: SettingsPanelProps) => (
  <>
    <PanelHeader title="Settings" />
    <div className={styles.view__fieldset}>
      <label className={styles.view__label} htmlFor="grid-size">
        Grid Size (px)
      </label>
      <input
        id="grid-size"
        name="grid-size"
        type="number"
        min={4}
        max={512}
        step={1}
        className={styles.view__input}
        value={gridSize}
        onChange={event => onGridSizeChange(Number(event.target.value))}
      />
    </div>
    <div className={styles.view__fieldset}>
      <label className={styles.view__label} htmlFor="grid-color">
        Grid Color
      </label>
      <input
        id="grid-color"
        name="grid-color"
        type="color"
        className={styles.view__input}
        value={gridColor ?? '#e0e5f5'}
        onChange={event => onGridColorChange(event.target.value)}
      />
    </div>
    <div className={styles.view__fieldset}>
      <label className={styles.view__label} htmlFor="background-color">
        Background Color
      </label>
      <input
        id="background-color"
        name="background-color"
        type="color"
        className={styles.view__input}
        value={backgroundColor ?? '#0c0d11'}
        onChange={event => onBackgroundColorChange(event.target.value)}
      />
    </div>
    <div className={styles['view__panel-actions']}>
      <button
        className={`${styles.view__button} ${styles['view__button--ghost']}`}
        type="button"
        onClick={onToggleGrid}
        aria-label="Toggle grid visibility"
      >
        {gridVisible ? 'Hide grid' : 'Show grid'}
      </button>
      <button
        className={styles.view__button}
        type="button"
        onClick={onStartCalibration}
      >
        {calibrationActive ? 'Cancel calibration' : 'Calibrate grid'}
      </button>
    </div>
  </>
);

export default SettingsPanel;
