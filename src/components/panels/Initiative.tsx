'use client';

import styles from '@/app/views.module.css';
import PanelHeader from './PanelHeader';
import type { SessionState } from '../../../types/session';

interface InitiativePanelProps {
  improvedInitiative: NonNullable<SessionState['improvedInitiative']>;
  onImprovedInitiativeChange: (
    settings: Partial<NonNullable<SessionState['improvedInitiative']>>,
  ) => void;
}

const InitiativePanel = ({
  improvedInitiative,
  onImprovedInitiativeChange,
}: InitiativePanelProps) => (
  <>
    <PanelHeader title="Improved Initiative" />
    <div className={styles.view__fieldset}>
      <label
        className={styles.view__label}
        htmlFor="improved-initiative-enabled"
      >
        Use Improved Initiative
      </label>
      <div className={styles['view__input-row']}>
        <input
          id="improved-initiative-enabled"
          name="improved-initiative-enabled"
          type="checkbox"
          className={styles.view__checkbox}
          checked={improvedInitiative.enabled}
          onChange={event =>
            onImprovedInitiativeChange({ enabled: event.target.checked })
          }
        />
        <span className={styles.view__hint}>
          {improvedInitiative.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
    </div>
    {improvedInitiative.enabled && (
      <>
        <div className={styles.view__fieldset}>
          <label className={styles.view__label} htmlFor="tracker-session-id">
            Session ID
          </label>
          <div className={styles['view__input-row']}>
            <input
              id="tracker-session-id"
              name="tracker-session-id"
              type="text"
              className={styles.view__input}
              placeholder="e.g. ABC123"
              value={improvedInitiative.sessionId}
              onChange={event =>
                onImprovedInitiativeChange({
                  sessionId: event.target.value.trim(),
                })
              }
            />
            <button
              className={styles.view__button}
              type="button"
              disabled={!improvedInitiative.sessionId}
              onClick={() => onImprovedInitiativeChange({ enabled: true })}
            >
              Show tracker
            </button>
          </div>
        </div>
        <div className={styles.view__fieldset}>
          <label className={styles.view__label} htmlFor="tracker-location">
            Tracker Placement
          </label>
          <div className={styles['view__inline-group']}>
            <select
              id="tracker-location"
              name="tracker-location"
              className={styles.view__input}
              value={improvedInitiative.location}
              onChange={event =>
                onImprovedInitiativeChange({
                  location: event.target.value as
                    | 'top-left'
                    | 'top-right'
                    | 'bottom-left'
                    | 'bottom-right',
                })
              }
            >
              <option value="top-left">Top left</option>
              <option value="top-right">Top right</option>
              <option value="bottom-left">Bottom left</option>
              <option value="bottom-right">Bottom right</option>
            </select>
            <select
              id="tracker-size"
              name="tracker-size"
              className={styles.view__input}
              value={improvedInitiative.size}
              onChange={event =>
                onImprovedInitiativeChange({
                  size: event.target.value as 'small' | 'medium' | 'large',
                })
              }
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
        <div className={styles.view__fieldset}>
          <label className={styles.view__label} htmlFor="tracker-height">
            Tracker Height (px)
          </label>
          <div className={styles['view__input-row']}>
            <input
              id="tracker-height"
              name="tracker-height"
              type="number"
              min={200}
              max={1400}
              step={10}
              className={styles.view__input}
              placeholder="Auto"
              value={improvedInitiative.height ?? ''}
              onChange={event => {
                const value = event.target.value;
                if (value === '') {
                  onImprovedInitiativeChange({ height: null });
                  return;
                }
                const numeric = Number(value);
                if (Number.isNaN(numeric)) return;
                onImprovedInitiativeChange({ height: numeric });
              }}
            />
            <span className={styles.view__hint}>
              Leave blank to use preset sizing
            </span>
          </div>
        </div>
        <div className={styles.view__fieldset}>
          <label className={styles.view__label} htmlFor="tracker-opacity">
            Tracker Opacity
          </label>
          <div className={styles['view__input-row']}>
            <input
              id="tracker-opacity"
              name="tracker-opacity"
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={improvedInitiative.opacity}
              onChange={event =>
                onImprovedInitiativeChange({
                  opacity: Number(event.target.value),
                })
              }
              className={styles.view__range}
            />
            <span className={styles.view__hint}>
              {Math.round(improvedInitiative.opacity * 100)}%
            </span>
          </div>
        </div>
      </>
    )}
  </>
);

export default InitiativePanel;
