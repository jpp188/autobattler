/**
 * Meta progression saved separately from runs: collection, achievements,
 * unlocked skins, lifetime stats and settings. Cosmetic only.
 */
export interface Settings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
  battleSpeed: 1 | 2 | 4;
  screenShake: boolean;
}

export interface MetaState {
  v: 1;
  /** Every unit id ever pulled. */
  collection: string[];
  achievements: string[];
  selectedSkin: Record<string, string>;
  stats: { runs: number; wins: number; bestFloor: number; packsOpened: number; legendaries: number };
  settings: Settings;
  tutorialDone: boolean;
  /** The Prologue is played once per save; later runs start in Act I. */
  prologueDone: boolean;
}

export function defaultMeta(): MetaState {
  return {
    v: 1,
    collection: [],
    achievements: [],
    selectedSkin: {},
    stats: { runs: 0, wins: 0, bestFloor: 0, packsOpened: 0, legendaries: 0 },
    settings: { master: 0.8, music: 0.5, sfx: 0.8, muted: false, battleSpeed: 1, screenShake: true },
    tutorialDone: false,
    prologueDone: false,
  };
}

/** Fills in any fields missing from an older save. */
export function normalizeMeta(m: Partial<MetaState> | null): MetaState {
  const d = defaultMeta();
  if (!m) return d;
  return {
    ...d,
    ...m,
    stats: { ...d.stats, ...(m.stats ?? {}) },
    settings: { ...d.settings, ...(m.settings ?? {}) },
    selectedSkin: { ...(m.selectedSkin ?? {}) },
    collection: [...(m.collection ?? [])],
    achievements: [...(m.achievements ?? [])],
    // Older saves: anyone who got past the Prologue (floor 5) has finished it.
    prologueDone: m.prologueDone ?? (m.stats?.bestFloor ?? 0) > 5,
  };
}
