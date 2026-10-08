/**
 * Global game state shared by the scenes: the current run, meta progress and
 * the save system. Scenes call `G.saveRun()` after every change.
 */
import { defaultMeta, normalizeMeta, type MetaState } from '../core/meta';
import { newRun, type RunState } from '../core/run';
import { randomSeed } from '../core/rng';
import { SaveSystem } from '../core/save';
import { rarityIndex } from '../core/types';
import { getUnit } from '../data';

class GameState {
  save = new SaveSystem();
  run: RunState | null = null;
  meta: MetaState = defaultMeta();

  load(): void {
    this.meta = normalizeMeta(this.save.loadMeta<MetaState>());
    this.run = this.save.loadRun<RunState>();
    if (this.run && (this.run.screen === 'over' || this.run.screen === 'victory') && !this.run.result) this.run = null;
  }

  hasRun(): boolean {
    return !!this.run && this.run.screen !== 'over' && this.run.screen !== 'victory';
  }

  startRun(heroId: string, skinId: string, seed = randomSeed()): RunState {
    this.run = newRun(heroId, skinId, seed);
    this.meta.stats.runs++;
    this.saveMeta();
    this.saveRun();
    return this.run;
  }

  saveRun(): void {
    if (this.run) {
      this.syncCollection();
      this.save.saveRun(this.run);
    }
  }

  saveMeta(): void {
    this.save.saveMeta(this.meta);
  }

  clearRun(): void {
    this.run = null;
    this.save.clearRun();
  }

  /** Has this unit never been pulled in any run? (for NEW tags) */
  isNewUnit = (id: string): boolean => !this.meta.collection.includes(id);

  /** Copies this run's pulls into the permanent collection. */
  syncCollection(): void {
    if (!this.run) return;
    let changed = false;
    for (const id of this.run.pulled) {
      if (!this.meta.collection.includes(id)) {
        this.meta.collection.push(id);
        if (rarityIndex(getUnit(id).rarity) === 4) this.meta.stats.legendaries++;
        changed = true;
      }
    }
    if (changed) this.saveMeta();
  }

  resetAll(): void {
    this.save.clearAll();
    this.run = null;
    this.meta = defaultMeta();
    this.saveMeta();
  }
}

export const G = new GameState();
