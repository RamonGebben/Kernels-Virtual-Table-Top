'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';

import Thumbnail from '@/components/Thumbnail';
import styles from '@/app/views.module.css';
import type { MapDescriptor } from '../../../types/messages';
import { artworkAtom, artworkLoadingAtom, artworkErrorAtom } from '@/state';
import { useArtwork } from '@/hooks/useArtwork';
import { useHiddenFileInput } from '@/hooks/useHiddenFileInput';
import PanelHeader from './PanelHeader';

interface ArtworkPanelProps {
  activeArtworkId?: string | null;
  onShow: (artwork: MapDescriptor | null) => void;
}

const ArtworkPanel = ({ activeArtworkId, onShow }: ArtworkPanelProps) => {
  const {
    refresh,
    loading: hookLoading,
    error: hookError,
    artwork,
    upload,
  } = useArtwork();
  const entries = useAtomValue(artworkAtom);
  const loading = useAtomValue(artworkLoadingAtom);
  const setLoading = useSetAtom(artworkLoadingAtom);
  const setError = useSetAtom(artworkErrorAtom);
  const setArtwork = useSetAtom(artworkAtom);
  const handleUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        await upload(file);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [upload, refresh, setError],
  );
  const { inputRef, openPicker, handleChange } = useHiddenFileInput(
    file => void handleUpload(file),
  );

  useEffect(() => {
    setLoading(hookLoading);
  }, [hookLoading, setLoading]);

  useEffect(() => {
    if (hookError) {
      setError(hookError);
    }
  }, [hookError, setError]);

  useEffect(() => {
    setArtwork(artwork);
  }, [artwork, setArtwork]);

  useEffect(() => {
    refresh().catch(err => {
      setError(err instanceof Error ? err.message : 'Unknown error');
    });
  }, [refresh, setError]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleChange}
        aria-label="Upload artwork hidden input"
        style={{ display: 'none' }}
      />
      <PanelHeader
        title="Artwork"
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
              onClick={() => onShow(null)}
              disabled={!activeArtworkId}
            >
              Hide overlay
            </button>
          </>
        }
      />
      <div className={styles.view__list}>
        {entries.length === 0 && !loading && (
          <div className={styles['view__list-meta']}>
            Upload an image to present it as artwork.
          </div>
        )}
        {loading && (
          <div className={styles['view__list-meta']}>Loading artwork…</div>
        )}
        {entries.map(artwork => {
          const isShowing = activeArtworkId === artwork.id;
          return (
            <button
              key={artwork.id}
              type="button"
              className={`${styles['view__list-item']} ${
                isShowing ? styles['view__list-item--active'] : ''
              }`}
              onClick={() => onShow(artwork)}
            >
              <Thumbnail
                src={
                  artwork.filename
                    ? `/api/artwork/${artwork.filename}`
                    : undefined
                }
                alt={artwork.name}
                className={styles.view__thumb}
                blankClassName={styles['view__thumb--blank']}
              />
              <div className={styles['view__list-body']}>
                <div className={styles['view__list-name']}>{artwork.name}</div>
                <div className={styles['view__list-meta']}>
                  Tap to {isShowing ? 'update' : 'show'} on table
                </div>
              </div>
              <span
                className={`${styles.view__status} ${styles['view__status--pill']}`}
              >
                {isShowing ? 'Showing' : 'Show'}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default ArtworkPanel;
