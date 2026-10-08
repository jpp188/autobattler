/**
 * Global game state shared by the scenes: the current run, meta progress and
 * the save system. Scenes call `G.saveRun()` after every change.
 */
import { defaultMeta, normalizeMeta, type MetaState } from '../core/meta';
import { newRun, type RunState } from '../core/run';
import { randomSeed } from '../core/rng';
import { SaveSystem } from '../core/save';
import { newAchievements } from '../core/achievements';
import { floorReached } from '../core/run';
import { rarityIndex, type AchievementDef } from '../core/types';
import { ACHIEVEMENTS, getAchievement, getUnit } from '../data';

class GameState {
  save = new SaveSystem();
  run: RunState | null = null;
  meta: MetaState = defaultMeta();
  /** Achievements unlocked during the current run (shown on the run-end screen). */
  runAchievements: string[] = [];
  /** Unlocks waiting to be shown as a toast by the active scene. */
  toastQueue: AchievementDef[] = [];
  /** Set by the active scene so it can show toasts as soon as they arrive. */
  onAchievement: (() => void) | null = null;

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
    this.runAchievements = [];
    this.meta.selectedSkin[heroId] = skinId;
    this.meta.stats.runs++;
    this.saveMeta();
    this.saveRun();
    return this.run;
  }

  saveRun(): void {
    if (this.run) {
      this.syncCollection();
      this.checkAchievements();
      this.save.saveRun(this.run);
    }
  }

  saveMeta(): void {
    this.save.saveMeta(this.meta);
  }

  /** Unlocks any achievements the current run has met. */
  checkAchievements(): void {
    if (!this.run) return;
    const fresh = newAchievements(this.run, ACHIEVEMENTS, this.meta.achievements);
    if (!fresh.length) return;
    for (const id of fresh) {
      this.meta.achievements.push(id);
      this.runAchievements.push(id);
      this.toastQueue.push(getAchievement(id));
    }
    this.saveMeta();
    this.onAchievement?.();
  }

  /**
   * Records a finished run in meta progress and deletes the run save. The
   * run stays in memory so the end screen can show it.
   */
  finishRun(): void {
    const run = this.run;
    if (!run || !run.result) return;
    this.syncCollection();
    this.checkAchievements();
    if (run.result.won) this.meta.stats.wins++;
    this.meta.stats.bestFloor = Math.max(this.meta.stats.bestFloor, floorReached(run));
    this.meta.stats.packsOpened += run.stats.packsOpened;
    this.saveMeta();
    this.save.clearRun();
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
