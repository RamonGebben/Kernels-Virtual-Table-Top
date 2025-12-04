'use client';

import { useCallback, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import Thumbnail from '@/components/Thumbnail';
import styles from '@/app/views.module.css';
import type { MapDescriptor } from '../../../types/messages';
import { BLANK_MAP } from '../../../types/session';
import { useMaps } from '@/hooks/useMaps';
import { mapsAtom, mapsErrorAtom, mapsLoadingAtom } from '@/state';
import { useHiddenFileInput } from '@/hooks/useHiddenFileInput';
import PanelHeader from './PanelHeader';

interface MapsPanelProps {
  activeMapId: string;
  onSelect: (map: MapDescriptor) => void;
}

const MapsPanel = ({ activeMapId, onSelect }: MapsPanelProps) => {
  const { maps, loading, error, refresh, upload } = useMaps();
  const [mapList, setMaps] = useAtom(mapsAtom);
  const setLoading = useSetAtom(mapsLoadingAtom);
  const setError = useSetAtom(mapsErrorAtom);
  const mapsLoading = useAtomValue(mapsLoadingAtom);
  const mapsError = useAtomValue(mapsErrorAtom);

  useEffect(() => {
    setMaps(maps);
  }, [maps, setMaps]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    setError(error);
  }, [error, setError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const descriptor = await upload(file);
        onSelect(descriptor);
      } catch (err) {
        console.error(err);
      }
    },
    [onSelect, upload],
  );

  const { inputRef, openPicker, handleChange } = useHiddenFileInput(
    file => void handleUpload(file),
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleChange}
        aria-label="Upload map hidden input"
        style={{ display: 'none' }}
      />
      <PanelHeader
        title="Maps"
        actions={
          <>
            <button
              className={styles.view__button}
              type="button"
              onClick={openPicker}
            >
              Upload
            </button>
            <button
              className={`${styles.view__button} ${styles['view__button--ghost']}`}
              type="button"
              onClick={() => onSelect(BLANK_MAP)}
            >
              Blank
            </button>
          </>
        }
      />
      <div className={styles.view__list}>
        {mapsLoading && (
          <div className={styles['view__list-meta']}>Loading maps…</div>
        )}
        {mapsError && (
          <div className={styles['view__list-meta']}>Error: {mapsError}</div>
        )}
        {!mapsLoading &&
          mapList.map(map => {
            const isActive = map.id === activeMapId;
            return (
              <button
                key={map.id}
                type="button"
                className={`${styles['view__list-item']} ${
                  isActive ? styles['view__list-item--active'] : ''
                }`}
                onClick={() => onSelect(map)}
              >
                <Thumbnail
                  src={map.filename ? `/api/maps/${map.filename}` : undefined}
                  className={styles.view__thumb}
                  blankClassName={styles['view__thumb--blank']}
                />
                <div className={styles['view__list-body']}>
                  <div className={styles['view__list-name']}>{map.name}</div>
                  <div className={styles['view__list-meta']}>
                    {map.filename || 'blank'}
                  </div>
                </div>
                {isActive && (
                  <span
                    className={`${styles.view__status} ${styles['view__status--pill']}`}
                  >
                    Active
                  </span>
                )}
              </button>
            );
          })}
      </div>
    </>
  );
};

export default MapsPanel;
