'use client';

import { useEffect, useMemo } from 'react';

import ViewportCanvas from '@/components/canvas/ViewportCanvas';
import styles from '../views.module.css';
import { useSessionState } from '@/hooks/useSessionState';
import { DEFAULT_SESSION } from '../../../types/session';
import type { CSSProperties } from 'react';

const TablePage = () => {
  const { session, sendTableSize, connectionLost, connected } =
    useSessionState('table');
  const tracker =
    session.improvedInitiative ?? DEFAULT_SESSION.improvedInitiative!;
  const trackerSessionId = tracker.sessionId.trim();
  const trackerUrl =
    tracker.enabled && trackerSessionId
      ? `https://improvedinitiative.app/p/${encodeURIComponent(
          trackerSessionId,
        )}`
      : null;

  const sizeScale =
    tracker.size === 'small' ? 0.86 : tracker.size === 'large' ? 1.16 : 1;
  const baseWidth = 520;
  const baseHeight = tracker.height ?? 340;
  const embedWidth = baseWidth * sizeScale;
  const embedHeight = baseHeight * sizeScale;
  const trackerWidth = embedWidth;
  const trackerHeight = embedHeight;
  const fog = useMemo(
    () => ({
      ...DEFAULT_SESSION.fog!,
      ...(session.fog ?? {}),
      strokes: session.fog?.strokes ?? DEFAULT_SESSION.fog!.strokes,
    }),
    [session.fog],
  );

  const trackerWidthVar = '--tracker-width' as const;
  const trackerHeightVar = '--tracker-height' as const;
  const trackerScaleVar = '--tracker-scale' as const;
  const trackerStyle: CSSProperties &
    Record<
      typeof trackerWidthVar | typeof trackerHeightVar | typeof trackerScaleVar,
      string
    > = {
    opacity: tracker.opacity,
    [trackerWidthVar]: `${trackerWidth}px`,
    [trackerHeightVar]: `${trackerHeight}px`,
    [trackerScaleVar]: '1',
  };

  const trackerEmbedStyle: CSSProperties = {
    width: `${embedWidth}px`,
    height: `${embedHeight}px`,
  };

  useEffect(() => {
    const sendSize = () => {
      sendTableSize({ width: window.innerWidth, height: window.innerHeight });
    };
    if (!connected) return undefined;
    sendSize();
    window.addEventListener('resize', sendSize);
    return () => window.removeEventListener('resize', sendSize);
  }, [sendTableSize, connected]);

  return (
    <main className={`${styles.view} ${styles['view--table']}`}>
      {connectionLost && (
        <div className={styles.view__toast}>
          Connection lost. Trying to reconnect…
        </div>
      )}
      {session.artwork?.filename && (
        <div
          className={styles['view__artwork-overlay']}
          role="dialog"
          aria-label={`Artwork: ${session.artwork.name}`}
        >
          <div className={styles['view__artwork-frame']}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/artwork/${session.artwork.filename}`}
              alt={session.artwork.name}
              className={styles['view__artwork-image']}
            />
          </div>
        </div>
      )}
      {trackerUrl && (
        <div
          className={`${styles.view__tracker} ${
            styles[`view__tracker--${tracker.location}`]
          } ${styles[`view__tracker--${tracker.size}`]}`}
          style={trackerStyle}
        >
          <div className={styles.view__trackerFrame}>
            <iframe
              title="Improved Initiative tracker"
              src={trackerUrl}
              className={styles.view__trackerEmbed}
              style={trackerEmbedStyle}
            />
          </div>
        </div>
      )}
      <ViewportCanvas
        grid={session.grid}
        map={session.map}
        viewport={session.tableViewport}
        className={`${styles.view__canvas} ${styles['view__canvas--table']}`}
        fog={fog}
        fogOpacityOverride={fog.opacityTable}
        backgroundColor={session.grid.backgroundColor ?? '#111217'}
      />
    </main>
  );
};

export default TablePage;
