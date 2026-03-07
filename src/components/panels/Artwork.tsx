'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';

import Thumbnail from '@/components/Thumbnail';
import ContextMenu from '@/components/ContextMenu';
import styles from '@/app/views.module.css';
import type { MapDescriptor } from '../../../types/messages';
import type { FolderEntry } from '../../../types/maps';
import {
  artworkAtom,
  artworkErrorAtom,
  artworkFoldersAtom,
  artworkLoadingAtom,
} from '@/state';
import { useArtwork } from '@/hooks/useArtwork';
import { useHiddenFileInput } from '@/hooks/useHiddenFileInput';
import PanelHeader from './PanelHeader';

interface ArtworkPanelProps {
  activeArtworkId?: string | null;
  onShow: (artwork: MapDescriptor | null) => void;
}

type MenuState = { key: string; rect: DOMRect } | null;

const ArtworkPanel = ({ activeArtworkId, onShow }: ArtworkPanelProps) => {
  const {
    refresh,
    loading: hookLoading,
    error: hookError,
    artwork,
    folders,
    upload,
    deleteArtwork,
    moveArtwork,
    createFolder,
    renameFolder,
    deleteFolder,
  } = useArtwork();

  const entries = useAtomValue(artworkAtom);
  const loading = useAtomValue(artworkLoadingAtom);
  const setLoading = useSetAtom(artworkLoadingAtom);
  const setError = useSetAtom(artworkErrorAtom);
  const setArtwork = useSetAtom(artworkAtom);
  const setFolders = useSetAtom(artworkFoldersAtom);

  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [openMenu, setOpenMenu] = useState<MenuState>(null);
  const [movingArtwork, setMovingArtwork] = useState<string | null>(null);

  useEffect(() => { setLoading(hookLoading); }, [hookLoading, setLoading]);
  useEffect(() => { if (hookError) setError(hookError); }, [hookError, setError]);
  useEffect(() => { setArtwork(artwork); }, [artwork, setArtwork]);
  useEffect(() => { setFolders(folders); }, [folders, setFolders]);
  useEffect(() => {
    refresh().catch(err => {
      setError(err instanceof Error ? err.message : 'Unknown error');
    });
  }, [refresh, setError]);

  const folderEntries = activeFolder
    ? entries.filter(a => a.id.startsWith(activeFolder + '/'))
    : [];
  const rootEntries = activeFolder
    ? []
    : entries.filter(a => !a.id.includes('/'));

  const handleUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        await upload(file, activeFolder ?? undefined);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [upload, refresh, setError, activeFolder],
  );

  const { inputRef, openPicker, handleChange } = useHiddenFileInput(
    file => void handleUpload(file),
  );

  const openMenuFor = (key: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setOpenMenu(prev => (prev?.key === key ? null : { key, rect }));
    setMovingArtwork(null);
  };

  const closeMenu = () => setOpenMenu(null);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName.trim());
      setCreatingFolder(false);
      setNewFolderName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameFolder = async () => {
    if (!renamingFolder || !renameName.trim()) return;
    try {
      await renameFolder(renamingFolder, renameName.trim());
      if (activeFolder === renamingFolder) setActiveFolder(renameName.trim());
      setRenamingFolder(null);
      setRenameName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFolder = async (name: string) => {
    try {
      await deleteFolder(name);
      closeMenu();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteArtwork = async (artworkPath: string) => {
    try {
      await deleteArtwork(artworkPath);
      closeMenu();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMove = async (artworkPath: string, targetFolder: string | null) => {
    try {
      await moveArtwork(artworkPath, targetFolder);
      setMovingArtwork(null);
      closeMenu();
    } catch (err) {
      console.error(err);
    }
  };

  const renderArtworkItem = (item: MapDescriptor, inFolder: boolean) => {
    const isShowing = activeArtworkId === item.id;
    const isMenuOpen = openMenu?.key === item.id;
    const isMoving = movingArtwork === item.id;
    const otherFolders = inFolder
      ? folders.filter(f => f.name !== activeFolder)
      : folders;

    return (
      <div key={item.id}>
        <div
          role="button"
          tabIndex={0}
          className={`${styles['view__list-item']} ${isShowing ? styles['view__list-item--active'] : ''}`}
          onClick={() => onShow(item)}
          onKeyDown={e => e.key === 'Enter' && onShow(item)}
        >
          <Thumbnail
            src={item.filename ? `/api/artwork/${item.filename}` : undefined}
            alt={item.name}
            className={styles.view__thumb}
            blankClassName={styles['view__thumb--blank']}
          />
          <div className={styles['view__list-body']}>
            <div className={styles['view__list-name']}>{item.name}</div>
            <div className={styles['view__list-meta']}>
              Tap to {isShowing ? 'update' : 'show'} on table
            </div>
          </div>
          <span className={`${styles.view__status} ${styles['view__status--pill']}`}>
            {isShowing ? 'Showing' : 'Show'}
          </span>
          <button
            type="button"
            className={styles['view__icon-btn']}
            onClick={e => openMenuFor(item.id, e)}
          >
            ⋯
          </button>
        </div>
        {isMenuOpen && openMenu && (
          <ContextMenu anchor={openMenu.rect} onClose={closeMenu}>
            {!isMoving ? (
              <>
                <button
                  type="button"
                  className={styles['view__menu-item']}
                  onClick={() => setMovingArtwork(item.id)}
                >
                  Move to…
                </button>
                <button
                  type="button"
                  className={`${styles['view__menu-item']} ${styles['view__menu-item--danger']}`}
                  onClick={() => void handleDeleteArtwork(item.id)}
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <div className={styles['view__menu-label']}>Move to</div>
                {inFolder && (
                  <button
                    type="button"
                    className={styles['view__menu-item']}
                    onClick={() => void handleMove(item.id, null)}
                  >
                    Root
                  </button>
                )}
                {otherFolders.map((f: FolderEntry) => (
                  <button
                    key={f.name}
                    type="button"
                    className={styles['view__menu-item']}
                    onClick={() => void handleMove(item.id, f.name)}
                  >
                    {f.name}
                  </button>
                ))}
                {otherFolders.length === 0 && !inFolder && (
                  <div className={styles['view__menu-label']}>No folders yet</div>
                )}
              </>
            )}
          </ContextMenu>
        )}
      </div>
    );
  };

  if (activeFolder !== null) {
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
          title={activeFolder}
          actions={
            <>
              <button
                className={`${styles.view__button} ${styles['view__button--ghost']}`}
                type="button"
                onClick={() => setActiveFolder(null)}
              >
                ← Back
              </button>
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
                Hide
              </button>
            </>
          }
        />
        <div className={styles.view__list}>
          {folderEntries.length === 0 && !loading && (
            <div className={styles['view__list-meta']}>
              No artwork in this folder.
            </div>
          )}
          {folderEntries.map(item => renderArtworkItem(item, true))}
        </div>
      </>
    );
  }

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
              className={styles.view__button}
              type="button"
              onClick={() => {
                setCreatingFolder(true);
                setNewFolderName('');
              }}
            >
              New Folder
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

        {/* Folders */}
        {folders.map((folder: FolderEntry) => {
          const menuKey = `folder:${folder.name}`;
          const isMenuOpen = openMenu?.key === menuKey;
          const isRenaming = renamingFolder === folder.name;

          return (
            <div key={folder.name}>
              {isRenaming ? (
                <div className={styles['view__inline-input-row']}>
                  <input
                    className={styles.view__input}
                    style={{ flex: 1, minWidth: 0 }}
                    value={renameName}
                    onChange={e => setRenameName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') void handleRenameFolder();
                      if (e.key === 'Escape') setRenamingFolder(null);
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className={styles['view__icon-btn']}
                    onClick={() => void handleRenameFolder()}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className={styles['view__icon-btn']}
                    onClick={() => setRenamingFolder(null)}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  className={styles['view__folder-row']}
                  onClick={() => setActiveFolder(folder.name)}
                  onKeyDown={e => e.key === 'Enter' && setActiveFolder(folder.name)}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>📁</span>
                  <div className={styles['view__list-body']}>
                    <div className={styles['view__list-name']}>{folder.name}</div>
                    <div className={styles['view__list-meta']}>
                      {folder.itemCount} image{folder.itemCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles['view__icon-btn']}
                    onClick={e => openMenuFor(menuKey, e)}
                  >
                    ⋯
                  </button>
                </div>
              )}
              {isMenuOpen && openMenu && (
                <ContextMenu anchor={openMenu.rect} onClose={closeMenu}>
                  <button
                    type="button"
                    className={styles['view__menu-item']}
                    onClick={() => {
                      setRenamingFolder(folder.name);
                      setRenameName(folder.name);
                      closeMenu();
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className={`${styles['view__menu-item']} ${styles['view__menu-item--danger']}`}
                    disabled={folder.itemCount > 0}
                    onClick={() => void handleDeleteFolder(folder.name)}
                  >
                    Delete
                  </button>
                </ContextMenu>
              )}
            </div>
          );
        })}

        {/* New folder input */}
        {creatingFolder && (
          <div className={styles['view__inline-input-row']}>
            <input
              className={styles.view__input}
              style={{ flex: 1, minWidth: 0 }}
              placeholder="Folder name"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleCreateFolder();
                if (e.key === 'Escape') setCreatingFolder(false);
              }}
              autoFocus
            />
            <button
              type="button"
              className={styles['view__icon-btn']}
              onClick={() => void handleCreateFolder()}
            >
              ✓
            </button>
            <button
              type="button"
              className={styles['view__icon-btn']}
              onClick={() => setCreatingFolder(false)}
            >
              ✕
            </button>
          </div>
        )}

        {/* Root artwork */}
        {rootEntries.map(item => renderArtworkItem(item, false))}
      </div>
    </>
  );
};

export default ArtworkPanel;
