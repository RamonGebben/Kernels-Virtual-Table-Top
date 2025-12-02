'use client';

import { atom } from 'jotai';
import { BLANK_MAP } from '../../types/session';
import type { MapDescriptor } from '../../types/messages';

export type PanelKey = 'maps' | 'artwork' | 'settings' | null;

export const activePanelAtom = atom<PanelKey>(null);

export const mapsAtom = atom<MapDescriptor[]>([BLANK_MAP]);

export const mapsLoadingAtom = atom<boolean>(false);

export const mapsErrorAtom = atom<string | null>(null);

export const artworkAtom = atom<MapDescriptor[]>([]);
export const artworkLoadingAtom = atom<boolean>(false);
export const artworkErrorAtom = atom<string | null>(null);

export const calibrationActiveAtom = atom<boolean>(false);
