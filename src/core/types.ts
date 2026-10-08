/**
 * Core data types shared by the data files, the simulation and the scenes.
 * Nothing in here (or anywhere in src/core) may import Phaser.
 */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const RARITY_NAMES: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};
export function rarityIndex(r: Rarity): number {
  return RARITIES.indexOf(r);
}

export type Role = 'tank' | 'fighter' | 'assassin' | 'marksman' | 'caster' | 'support';
export type Star = 1 | 2 | 3;

/** The eight base stats from the design. */
export interface Stats {
  hp: number;
  /** Attack damage. */
  ad: number;
  /** Attack speed in attacks per second. */
  as: number;
  /** Range in hexes. */
  range: number;
  armor: number;
  mr: number;
  /** Crit chance 0..1. */
  crit: number;
  /** Move speed in hexes per second. */
  ms: number;
}
export type StatKey = keyof Stats;

/** Extra combat-only stats that effects can modify. */
export interface ExtraStats {
  /** Ability power multiplier in percent (100 = normal). */
  power: number;
  /** Fraction of damage dealt returned as healing. */
  lifesteal: number;
  /** Chance to dodge basic attacks 0..1. */
  dodge: number;
  /** Multiplier for ult charge gained, in percent (100 = normal). */
  chargeGain: number;
  /** Damage amplification in percent (0 = none). */
  dmgAmp: number;
  /** Damage reduction in percent (0 = none). */
  dmgReduce: number;
  /** Crit damage multiplier (1.5 = +50%). */
  critDmg: number;
}
export type CombatStatKey = StatKey | keyof ExtraStats;
export type CombatStats = Stats & ExtraStats;

/** A value that can scale with star level: a single number or [1★, 2★, 3★]. */
export type PerStar = number | readonly [number, number, number];

export type DamageType = 'physical' | 'magic' | 'true';

export type PickRule =
  | 'self'
  | 'target'
  | 'nearest'
  | 'farthest'
  | 'lowestHp'
  | 'highestHp'
  | 'highestAd'
  | 'random'
  | 'all'
  | 'attacker';

/**
 * Chooses who an ability step affects. `pick` chooses primary targets on
 * `side`; when `radius` is set, everything on `side` within that many hexes of
 * each primary target is affected as well (an area of effect).
 */
export interface TargetSel {
  pick: PickRule;
  side?: 'enemy' | 'ally';
  count?: PerStar;
  radius?: PerStar;
  includeSelf?: boolean;
}

export type Effect =
  | { k: 'damage'; amount: PerStar; adRatio?: PerStar; dtype: DamageType; maxHpPct?: PerStar }
  | { k: 'heal'; amount: PerStar; adRatio?: PerStar; maxHpPct?: PerStar }
  | { k: 'shield'; amount: PerStar; maxHpPct?: PerStar; duration: number }
  | { k: 'stun'; duration: PerStar }
  | { k: 'buff'; stat: CombatStatKey; amount: PerStar; pct?: boolean; duration?: number }
  | { k: 'debuff'; stat: CombatStatKey; amount: PerStar; pct?: boolean; duration?: number }
  | { k: 'dot'; dps: PerStar; adRatio?: PerStar; duration: number; dtype: DamageType }
  | { k: 'summon'; unit: string; count: PerStar; star?: PerStar }
  | { k: 'dash'; to: 'target' | 'backline' | 'away' }
  | { k: 'charge'; amount: PerStar }
  | { k: 'taunt'; duration: PerStar }
  | { k: 'cleanse' }
  | { k: 'invulnerable'; duration: PerStar }
  /** Invulnerable until no ally with the given tag is alive. */
  | { k: 'guarded'; tag: string }
  /** Swap the positions of the selected units with each other (boss trick). */
  | { k: 'swap' }
  | { k: 'execute'; threshold: PerStar }
  | { k: 'knockback'; distance: number };

export type FxKind =
  | 'slash'
  | 'burst'
  | 'beam'
  | 'heal'
  | 'shield'
  | 'fire'
  | 'frost'
  | 'lightning'
  | 'petal'
  | 'shadow'
  | 'jade'
  | 'star'
  | 'roar'
  | 'arrow'
  | 'orb'
  | 'poison';

export interface AbilityStep {
  sel: TargetSel;
  effects: readonly Effect[];
  /** If set, the effects travel as a projectile at this speed (hexes/sec). */
  projectile?: number;
  fx?: FxKind;
}

export interface UltimateDef {
  name: string;
  steps: readonly AbilityStep[];
  /** Extra steps that only happen at 3 stars (the "large upgrade"). */
  star3Steps?: readonly AbilityStep[];
  /** Seconds the caster is locked while casting. */
  castTime?: number;
  fx?: FxKind;
  /** Big ults shake the camera. */
  big?: boolean;
}

export type PassiveTrigger =
  | 'static'
  | 'battleStart'
  | 'onAttack'
  | 'onHitTaken'
  | 'onKill'
  | 'onCast'
  | 'interval'
  | 'hpBelow'
  | 'allyDeath'
  | 'everyNthAttack';

export interface PassiveDef {
  name: string;
  /** Optional hand-written text; otherwise the text is generated from the effects. */
  desc?: string;
  trigger: PassiveTrigger;
  /** Static stat bonuses (flat, or percent if listed in pctStats). */
  stats?: Partial<Record<CombatStatKey, PerStar>>;
  pctStats?: Partial<Record<CombatStatKey, PerStar>>;
  steps?: readonly AbilityStep[];
  chance?: number;
  /** Seconds between triggers for 'interval'. */
  interval?: number;
  /** HP fraction for 'hpBelow'. */
  threshold?: number;
  /** N for 'everyNthAttack'. */
  n?: number;
  /** Trigger at most once per battle. */
  once?: boolean;
}

/** Simple description of how to draw a unit in code (see src/art). */
export interface SpriteLook {
  body: 'robe' | 'armor' | 'light' | 'beast' | 'oni' | 'spirit' | 'bird' | 'serpent' | 'slime' | 'golem';
  skin: string;
  hair: string;
  main: string;
  accent: string;
  hairStyle?: 'long' | 'short' | 'bun' | 'spiky' | 'ponytail' | 'twin' | 'hood' | 'none' | 'mane';
  weapon?: 'sword' | 'katana' | 'bow' | 'staff' | 'fan' | 'spear' | 'claws' | 'daggers' | 'shield' | 'orb' | 'axe' | 'none';
  hat?: 'none' | 'kasa' | 'crown' | 'horns' | 'halo' | 'ears' | 'mask' | 'helm' | 'antlers';
  extra?: 'tail' | 'wings' | 'scarf' | 'cape' | 'aura' | 'none';
  big?: boolean;
}

export interface UnitDef {
  id: string;
  name: string;
  rarity: Rarity;
  role: Role;
  /** Origin trait id. */
  origin: string;
  /** Class trait id. */
  cls: string;
  flavor: string;
  sprite: string;
  look: SpriteLook;
  stats: Stats;
  passives: readonly PassiveDef[];
  ult: UltimateDef;
  /** Charge gained per basic attack (default from config). */
  chargePerAttack?: number;
  tags?: readonly string[];
  /** Enemy-only units never appear in packs. */
  enemyOnly?: boolean;
  /** Summons never appear in packs either. */
  summon?: boolean;
}

export type RunPerk =
  | { k: 'benchSlots'; n: number }
  | { k: 'firstPackRare' }
  | { k: 'startGold'; n: number }
  | { k: 'shopDiscount'; pct: number }
  | { k: 'extraPackChoice' };

export interface SkinDef {
  id: string;
  name: string;
  /** Palette overrides applied to the hero's look. */
  look: Partial<SpriteLook>;
  /** Achievement that unlocks it; undefined = always available. */
  unlockedBy?: string;
}

export interface HeroDef extends UnitDef {
  title: string;
  perk: { name: string; desc: string; effect: RunPerk };
  skins: readonly SkinDef[];
}

export type TraitKind = 'origin' | 'class';

export interface TraitBreakpoint {
  count: number;
  desc: string;
  /** Applies to every ally rather than just units with the trait. */
  team?: boolean;
  passives: readonly PassiveDef[];
  /** Run-level bonus (gold after a win and so on). */
  goldPerWin?: number;
}

export interface TraitDef {
  id: string;
  name: string;
  kind: TraitKind;
  color: string;
  icon: string;
  desc: string;
  breakpoints: readonly TraitBreakpoint[];
}

export type PackSpecial =
  | 'none'
  | 'trait'
  | 'origin'
  | 'class'
  | 'duo'
  | 'duplicate'
  | 'momentum'
  | 'mirror'
  | 'hero'
  | 'mystery'
  | 'artifact'
  | 'themedStarter'
  | 'gamble';

export type PackPlace = 'shop' | 'reward' | 'elite' | 'boss' | 'starter' | 'prologue' | 'event' | 'treasure';

export type RarityWeights = Record<Rarity, number>;

export interface PackDef {
  id: string;
  name: string;
  desc: string;
  /** Art: base colour and icon key for the generated pack sprite. */
  color: string;
  icon: string;
  cards: number;
  weights: RarityWeights;
  /** Per-slot overrides (0-based slot index). */
  slotWeights?: Record<number, Partial<RarityWeights>>;
  guaranteed?: readonly { slot: number; minRarity: Rarity }[];
  filter?: { traits?: readonly string[]; rarities?: readonly Rarity[]; roles?: readonly Role[] };
  special: PackSpecial;
  price: number;
  appears: readonly PackPlace[];
  minAct?: number;
  /** Hidden contents until opened. */
  hidden?: boolean;
}

/** A concrete pack offer: definition plus resolved parameters (e.g. the trait). */
export interface PackInstance {
  defId: string;
  /** Traits chosen for trait/origin/class/duo/themed packs. */
  traits?: string[];
  /** Unit id for duplicate/mirror packs. */
  unitId?: string;
  price?: number;
}

export type ArtifactTier = 'common' | 'uncommon' | 'rare' | 'boss';

export type ArtifactEffect =
  | { k: 'boardLimit'; n: number }
  | { k: 'benchSlots'; n: number }
  | { k: 'goldPerWin'; n: number }
  | { k: 'traitOdds'; trait: string; pct: number }
  | { k: 'rarityLuck'; pct: number }
  | { k: 'startCharge'; n: number }
  | { k: 'heroHealAfterFight'; pct: number }
  | { k: 'shopDiscount'; pct: number }
  | { k: 'teamStats'; stats: Partial<Record<CombatStatKey, number>>; pct?: boolean }
  | { k: 'heroStats'; stats: Partial<Record<CombatStatKey, number>>; pct?: boolean }
  | { k: 'actStarUp'; n: number }
  | { k: 'heroMaxHp'; pct: number }
  | { k: 'extraPackChoice' }
  | { k: 'interest'; per: number; max: number }
  | { k: 'sellBonus'; n: number };

export interface ArtifactDef {
  id: string;
  name: string;
  tier: ArtifactTier;
  icon: string;
  color: string;
  desc: string;
  effects: readonly ArtifactEffect[];
}

export interface EncounterUnit {
  unit: string;
  star: Star;
  /** Column 0..6 and row 0..3 from the enemy's own perspective (0 = front). */
  col: number;
  row: number;
}

export interface EncounterDef {
  id: string;
  name: string;
  act: number;
  kind: 'battle' | 'elite' | 'boss';
  units: readonly EncounterUnit[];
  /** Short description of a boss mechanic for the UI. */
  mechanic?: string;
  /** Floors (within the act) this encounter may appear on, inclusive. */
  floors?: readonly [number, number];
}

export type Outcome =
  | { k: 'gold'; n: number }
  | { k: 'heroHp'; pct: number }
  | { k: 'heroMaxHp'; n: number }
  | { k: 'pack'; pack: string }
  | { k: 'artifact'; tier: ArtifactTier | 'random' }
  | { k: 'sacrifice' }
  | { k: 'unit'; rarity: Rarity }
  | { k: 'momentum'; target: 'highest' | 'all' | 'random'; n: number }
  | { k: 'train'; stat: StatKey; amount: number }
  | { k: 'starUp' }
  | { k: 'gamble'; chance: number; win: readonly Outcome[]; lose: readonly Outcome[] }
  | { k: 'nothing' };

export interface EventChoice {
  label: string;
  /** What the choice will do, shown before choosing. */
  hint: string;
  requires?: { gold?: number; units?: number; heroHpPct?: number };
  outcomes: readonly Outcome[];
}

export interface EventDef {
  id: string;
  title: string;
  art: string;
  text: string;
  choices: readonly EventChoice[];
  minAct?: number;
}

export type AchievementCond =
  | { k: 'winRun' }
  | { k: 'reachAct'; act: number }
  | { k: 'reachActWithRarity'; act: number; rarity: Rarity; count: number }
  | { k: 'soloHeroWin' }
  | { k: 'momentumPair' }
  | { k: 'threeStar'; rarity?: Rarity }
  | { k: 'beatBoss'; act: number }
  | { k: 'goldHeld'; n: number }
  | { k: 'traitActive'; trait: string; count: number }
  | { k: 'legendaryPull' }
  | { k: 'winNoDamage' };

export interface AchievementDef {
  id: string;
  hero: string;
  name: string;
  desc: string;
  cond: AchievementCond;
}
