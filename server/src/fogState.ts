import {
  DEFAULT_SESSION,
  type FogState,
  type FogUpdate,
} from '../../types/session.js';

export const applyFogUpdate = (
  current: FogState | undefined,
  update: FogUpdate,
): FogState => {
  const base = {
    ...DEFAULT_SESSION.fog!,
    ...(current ?? {}),
    strokes: current?.strokes ?? DEFAULT_SESSION.fog!.strokes,
  };
  const start: FogState = {
    ...base,
    strokes: [...(base.strokes ?? [])],
  };

  switch (update.kind) {
    case 'toggle':
      return { ...start, enabled: update.enabled };
    case 'set-opacity':
      if (update.view === 'dm') {
        return { ...start, opacityDm: update.opacity };
      }
      return { ...start, opacityTable: update.opacity };
    case 'reset':
      return { ...start, strokes: update.strokes ? [...update.strokes] : [] };
    case 'stroke':
      return { ...start, strokes: [...start.strokes, update.stroke] };
    case 'stroke-batch':
      return { ...start, strokes: [...start.strokes, ...update.strokes] };
    default: {
      const _exhaustiveCheck: never = update;
      return _exhaustiveCheck;
    }
  }
};
