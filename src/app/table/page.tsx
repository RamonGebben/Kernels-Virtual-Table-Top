'use client';

import { useEffect } from 'react';

import ViewportCanvas from '@/components/canvas/ViewportCanvas';
import styles from '../views.module.css';
import { useSessionState } from '@/hooks/useSessionState';

const TablePage = () => {
  const { session, sendTableSize, connectionLost } = useSessionState('table');

  useEffect(() => {
    const sendSize = () => {
      sendTableSize({ width: window.innerWidth, height: window.innerHeight });
    };
    sendSize();
    window.addEventListener('resize', sendSize);
    return () => window.removeEventListener('resize', sendSize);
  }, [sendTableSize]);

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
      <ViewportCanvas
        grid={session.grid}
        map={session.map}
        viewport={session.tableViewport}
        className={`${styles.view__canvas} ${styles['view__canvas--table']}`}
        backgroundColor={session.grid.backgroundColor ?? '#111217'}
      />
    </main>
  );
};

export default TablePage;
