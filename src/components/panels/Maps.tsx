'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import Thumbnail from '@/components/Thumbnail';
import ContextMenu from '@/components/ContextMenu';
import styles from '@/app/views.module.css';
import type { MapDescriptor } from '../../../types/messages';
import type { FolderEntry } from '../../../types/maps';
import { BLANK_MAP, BLANK_MAP_ID } from '../../../types/session';
import { useMaps } from '@/hooks/useMaps';
import { mapFoldersAtom, mapsAtom, mapsErrorAtom, mapsLoadingAtom } from '@/state';
import { useHiddenFileInput } from '@/hooks/useHiddenFileInput';
import PanelHeader from './PanelHeader';

interface MapsPanelProps {
  activeMapId: string;
  onSelect: (map: MapDescriptor) => void;
}

type MenuState = { key: string; rect: DOMRect } | null;

const MapsPanel = ({ activeMapId, onSelect }: MapsPanelProps) => {
  const {
    maps,
    folders,
    loading,
    error,
    refresh,
    upload,
    deleteMap,
    moveMap,
    createFolder,
    renameFolder,
    deleteFolder,
  } = useMaps();

  const [mapList, setMaps] = useAtom(mapsAtom);
  const setLoading = useSetAtom(mapsLoadingAtom);
  const setError = useSetAtom(mapsErrorAtom);
  const setFolders = useSetAtom(mapFoldersAtom);
  const mapsLoading = useAtomValue(mapsLoadingAtom);
  const mapsError = useAtomValue(mapsErrorAtom);

  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [openMenu, setOpenMenu] = useState<MenuState>(null);
  const [movingMap, setMovingMap] = useState<string | null>(null);

  useEffect(() => { setMaps(maps); }, [maps, setMaps]);
  useEffect(() => { setLoading(loading); }, [loading, setLoading]);
  useEffect(() => { setError(error); }, [error, setError]);
  useEffect(() => { setFolders(folders); }, [folders, setFolders]);
  useEffect(() => { refresh(); }, [refresh]);

  const folderMaps = activeFolder
    ? mapList.filter(m => m.id.startsWith(activeFolder + '/'))
    : [];
  const rootMaps = mapList.filter(
    m => !m.id.includes('/') && m.id !== BLANK_MAP_ID,
  );

  const handleUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const descriptor = await upload(file, activeFolder ?? undefined);
        if (!activeFolder) onSelect(descriptor);
      } catch (err) {
        console.error(err);
      }
    },
    [onSelect, upload, activeFolder],
  );

  const { inputRef, openPicker, handleChange } = useHiddenFileInput(
    file => void handleUpload(file),
  );

  const openMenuFor = (key: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setOpenMenu(prev => (prev?.key === key ? null : { key, rect }));
    setMovingMap(null);
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

  const handleDeleteMap = async (mapPath: string) => {
    try {
      await deleteMap(mapPath);
      closeMenu();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveMap = async (mapPath: string, targetFolder: string | null) => {
    try {
      await moveMap(mapPath, targetFolder);
      setMovingMap(null);
      closeMenu();
    } catch (err) {
      console.error(err);
    }
  };

  const renderMapItem = (map: MapDescriptor, inFolder: boolean) => {
    const isActive = map.id === activeMapId;
    const isMenuOpen = openMenu?.key === map.id;
    const isMoving = movingMap === map.id;
    const otherFolders = inFolder
      ? folders.filter(f => f.name !== activeFolder)
      : folders;

    return (
      <div key={map.id}>
        <div
          role="button"
          tabIndex={0}
          className={`${styles['view__list-item']} ${isActive ? styles['view__list-item--active'] : ''}`}
          onClick={() => onSelect(map)}
          onKeyDown={e => e.key === 'Enter' && onSelect(map)}
        >
          <Thumbnail
            src={map.filename ? `/api/maps/${map.filename}` : undefined}
            className={styles.view__thumb}
            blankClassName={styles['view__thumb--blank']}
          />
          <div className={styles['view__list-body']}>
            <div className={styles['view__list-name']}>{map.name}</div>
            {isActive && (
              <span className={`${styles.view__status} ${styles['view__status--pill']}`}>
                Active
              </span>
            )}
          </div>
          <button
            type="button"
            className={styles['view__icon-btn']}
            onClick={e => openMenuFor(map.id, e)}
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
                  onClick={() => setMovingMap(map.id)}
                >
                  Move to…
                </button>
                <button
                  type="button"
                  className={`${styles['view__menu-item']} ${styles['view__menu-item--danger']}`}
                  onClick={() => void handleDeleteMap(map.id)}
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
                    onClick={() => void handleMoveMap(map.id, null)}
                  >
                    Root
                  </button>
                )}
                {otherFolders.map((f: FolderEntry) => (
                  <button
                    key={f.name}
                    type="button"
                    className={styles['view__menu-item']}
                    onClick={() => void handleMoveMap(map.id, f.name)}
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
          accept="image/png, image/jpeg, image/webp, video/webm"
          onChange={handleChange}
          aria-label="Upload map hidden input"
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
            </>
          }
        />
        <div className={styles.view__list}>
          {folderMaps.length === 0 && !mapsLoading && (
            <div className={styles['view__list-meta']}>No maps in this folder.</div>
          )}
          {folderMaps.map(map => renderMapItem(map, true))}
        </div>
      </>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, video/webm"
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
                      {folder.itemCount} map{folder.itemCount !== 1 ? 's' : ''}
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

        {/* Blank map */}
        {!mapsLoading && (() => {
          const isActive = activeMapId === BLANK_MAP_ID;
          return (
            <button
              key={BLANK_MAP_ID}
              type="button"
              className={`${styles['view__list-item']} ${isActive ? styles['view__list-item--active'] : ''}`}
              onClick={() => onSelect(BLANK_MAP)}
            >
              <Thumbnail
                src={undefined}
                className={styles.view__thumb}
                blankClassName={styles['view__thumb--blank']}
              />
              <div className={styles['view__list-body']}>
                <div className={styles['view__list-name']}>{BLANK_MAP.name}</div>
                <div className={styles['view__list-meta']}>blank</div>
              </div>
              {isActive && (
                <span className={`${styles.view__status} ${styles['view__status--pill']}`}>
                  Active
                </span>
              )}
            </button>
          );
        })()}

        {/* Root maps */}
        {!mapsLoading && rootMaps.map(map => renderMapItem(map, false))}
      </div>
    </>
  );
};

export default MapsPanel;
