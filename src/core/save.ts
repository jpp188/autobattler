/**
 * Versioned save system. The run and the meta progress are stored under
 * separate keys so a finished run never touches achievements and vice versa.
 * Storage is abstracted so tests and the headless bot can use memory.
 */

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

/** localStorage if usable, otherwise memory (private mode, tests, Node). */
export function defaultStore(): KeyValueStore {
  try {
    const ls = (globalThis as { localStorage?: KeyValueStore }).localStorage;
    if (ls) {
      const probe = '__packbound_probe__';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    }
  } catch {
    // fall through
  }
  return new MemoryStore();
}

export const RUN_KEY = 'packbound.run';
export const META_KEY = 'packbound.meta';

/** Bump when the save shape changes and add a migration below. */
export const RUN_SAVE_VERSION = 1;
export const META_SAVE_VERSION = 1;

interface Envelope<T> {
  version: number;
  savedAt: number;
  data: T;
}

type Migration = (data: unknown) => unknown;

/** Migrations from version N to N+1, keyed by N. */
const RUN_MIGRATIONS: Record<number, Migration> = {};
const META_MIGRATIONS: Record<number, Migration> = {};

function migrate(env: Envelope<unknown>, target: number, table: Record<number, Migration>): unknown | null {
  let { version, data } = env;
  while (version < target) {
    const m = table[version];
    if (!m) return null;
    data = m(data);
    version++;
  }
  return version === target ? data : null;
}

export class SaveSystem {
  constructor(public store: KeyValueStore = defaultStore()) {}

  private write<T>(key: string, version: number, data: T): void {
    const env: Envelope<T> = { version, savedAt: Date.now(), data };
    try {
      this.store.setItem(key, JSON.stringify(env));
    } catch {
      // Storage full or unavailable: the game keeps running without saving.
    }
  }

  private read<T>(key: string, version: number, table: Record<number, Migration>): T | null {
    let raw: string | null = null;
    try {
      raw = this.store.getItem(key);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      const env = JSON.parse(raw) as Envelope<unknown>;
      if (typeof env !== 'object' || env === null || typeof env.version !== 'number') return null;
      return migrate(env, version, table) as T | null;
    } catch {
      return null;
    }
  }

  saveRun<T>(run: T): void {
    this.write(RUN_KEY, RUN_SAVE_VERSION, run);
  }
  loadRun<T>(): T | null {
    return this.read<T>(RUN_KEY, RUN_SAVE_VERSION, RUN_MIGRATIONS);
  }
  clearRun(): void {
    try {
      this.store.removeItem(RUN_KEY);
    } catch {
      // ignore
    }
  }
  hasRun(): boolean {
    return this.loadRun() !== null;
  }

  saveMeta<T>(meta: T): void {
    this.write(META_KEY, META_SAVE_VERSION, meta);
  }
  loadMeta<T>(): T | null {
    return this.read<T>(META_KEY, META_SAVE_VERSION, META_MIGRATIONS);
  }
  clearAll(): void {
    try {
      this.store.removeItem(RUN_KEY);
      this.store.removeItem(META_KEY);
    } catch {
      // ignore
    }
  }
}
