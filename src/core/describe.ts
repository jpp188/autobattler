/**
 * Generates readable ability text from effect data, so descriptions can never
 * drift away from what the ability actually does.
 */
import type { AbilityStep, CombatStatKey, Effect, PassiveDef, PerStar, Star, TargetSel, UltimateDef } from './types';
import { FRACTION_STATS, STAT_LABELS } from './units';

type NameOf = (unitId: string) => string;

function v(x: PerStar | undefined, star?: Star, pct = false): string {
  if (x === undefined) return '0';
  const f = (n: number) => (pct ? `${Math.round(n * 100)}%` : `${Math.round(n * 100) / 100}`);
  if (typeof x === 'number') return f(x);
  if (star) return f(x[star - 1]);
  return x[0] === x[1] && x[1] === x[2] ? f(x[0]) : x.map(f).join('/');
}

function statText(stat: CombatStatKey, amount: string, pct: boolean, sign: string): string {
  const label = STAT_LABELS[stat];
  if (pct) return `${sign}${amount}% ${label}`;
  if (FRACTION_STATS.has(stat)) {
    const n = Number(amount.split('/')[0]);
    if (!Number.isNaN(n)) return `${sign}${amount.split('/').map((a) => Math.round(Number(a) * 100)).join('/')}% ${label}`;
  }
  if (stat === 'critDmg') return `${sign}${amount.split('/').map((a) => Math.round(Number(a) * 100)).join('/')}% ${label}`;
  if (stat === 'power' || stat === 'chargeGain' || stat === 'dmgAmp' || stat === 'dmgReduce') return `${sign}${amount}% ${label}`;
  return `${sign}${amount} ${label}`;
}

export function describeSel(sel: TargetSel, star?: Star): string {
  const count = sel.count !== undefined ? v(sel.count, star) : '1';
  const plural = count !== '1';
  const side = sel.side ?? 'enemy';
  const radius = sel.radius !== undefined ? v(sel.radius, star) : null;
  const hex = (r: string) => `${r} hex${r === '1' ? '' : 'es'}`;
  switch (sel.pick) {
    case 'self':
      if (radius) return side === 'ally' ? `Allies within ${hex(radius)}` : `Enemies within ${hex(radius)}`;
      return 'Self';
    case 'target':
      return radius ? `Target + enemies within ${hex(radius)}` : 'Target';
    case 'attacker':
      return 'The attacker';
    case 'nearest':
      return plural ? `${count} nearest enemies` : 'Nearest enemy';
    case 'farthest':
      return plural ? `${count} farthest enemies` : 'Farthest enemy';
    case 'lowestHp':
      return side === 'ally' ? (plural ? `${count} most wounded allies` : 'Most wounded ally') : plural ? `${count} weakest enemies` : 'Weakest enemy';
    case 'highestHp':
      return side === 'ally' ? 'Healthiest ally' : 'Healthiest enemy';
    case 'highestAd':
      return plural ? `${count} strongest allies` : 'Strongest ally';
    case 'random':
      return `${count} random ${side === 'ally' ? 'all' : 'enem'}${plural ? 'ies' : side === 'ally' ? 'y' : 'y'}`;
    case 'all':
      return side === 'ally' ? 'All allies' : 'All enemies';
  }
}

export function describeEffect(e: Effect, star?: Star, nameOf?: NameOf): string {
  switch (e.k) {
    case 'damage': {
      const parts: string[] = [];
      if (typeof e.amount !== 'number' || e.amount !== 0) parts.push(v(e.amount, star));
      if (e.adRatio !== undefined) parts.push(`${v(e.adRatio, star, true)} Atk`);
      if (e.maxHpPct !== undefined) parts.push(`${v(e.maxHpPct, star, true)} max HP`);
      return `${parts.join(' + ')} ${e.dtype} dmg`;
    }
    case 'heal': {
      const parts: string[] = [];
      if (typeof e.amount !== 'number' || e.amount !== 0) parts.push(v(e.amount, star));
      if (e.adRatio !== undefined) parts.push(`${v(e.adRatio, star, true)} Atk`);
      if (e.maxHpPct !== undefined) parts.push(`${v(e.maxHpPct, star, true)} max HP`);
      return `heal ${parts.join(' + ')}`;
    }
    case 'shield': {
      const parts: string[] = [];
      if (typeof e.amount !== 'number' || e.amount !== 0) parts.push(v(e.amount, star));
      if (e.maxHpPct !== undefined) parts.push(`${v(e.maxHpPct, star, true)} max HP`);
      return `${parts.join(' + ')} shield (${e.duration}s)`;
    }
    case 'stun':
      return `stun ${v(e.duration, star)}s`;
    case 'buff':
      return statText(e.stat, v(e.amount, star), !!e.pct, '+') + (e.duration ? ` (${e.duration}s)` : '');
    case 'debuff':
      return statText(e.stat, v(e.amount, star), !!e.pct, '-') + (e.duration ? ` (${e.duration}s)` : '');
    case 'dot':
      return `${v(e.dps, star)} ${e.dtype} dmg/s for ${e.duration}s`;
    case 'summon':
      return `summon ${v(e.count, star)} ${nameOf ? nameOf(e.unit) : e.unit}${e.star ? ` (${v(e.star, star)}★)` : ''}`;
    case 'dash':
      return e.to === 'backline' ? 'leap to the enemy backline' : e.to === 'away' ? 'leap away' : 'dash to the target';
    case 'charge':
      return `+${v(e.amount, star)} ult charge`;
    case 'taunt':
      return `taunt ${v(e.duration, star)}s`;
    case 'cleanse':
      return 'cleanse debuffs';
    case 'invulnerable':
      return `invulnerable ${v(e.duration, star)}s`;
    case 'guarded':
      return 'invulnerable while its guards live';
    case 'swap':
      return 'swap their positions';
    case 'execute':
      return `execute below ${v(e.threshold, star, true)} HP`;
    case 'knockback':
      return `knock back ${e.distance}`;
  }
}

export function describeStep(s: AbilityStep, star?: Star, nameOf?: NameOf): string {
  const effects = s.effects.map((e) => describeEffect(e, star, nameOf)).join(', ');
  const sel = describeSel(s.sel, star);
  return `${sel}: ${effects}${s.projectile ? ' (projectile)' : ''}.`;
}

export function describeUlt(u: UltimateDef, star?: Star, nameOf?: NameOf): string {
  const main = u.steps.map((s) => describeStep(s, star, nameOf)).join(' ');
  const extra = u.star3Steps?.length ? ` 3★: ${u.star3Steps.map((s) => describeStep(s, 3, nameOf)).join(' ')}` : '';
  return main + (star === undefined || star === 3 ? extra : extra ? ` [3★ upgrade]` : '');
}

const TRIGGERS: Record<PassiveDef['trigger'], (p: PassiveDef) => string> = {
  static: () => '',
  battleStart: () => 'Battle start',
  onAttack: (p) => (p.chance ? `On attack (${Math.round(p.chance * 100)}%)` : 'On attack'),
  onHitTaken: (p) => (p.chance ? `When hit (${Math.round(p.chance * 100)}%)` : 'When hit'),
  onKill: () => 'On kill',
  onCast: () => 'After casting',
  interval: (p) => `Every ${p.interval ?? 3}s`,
  hpBelow: (p) => `Below ${Math.round((p.threshold ?? 0.5) * 100)}% HP (once)`,
  allyDeath: () => 'When an ally dies',
  everyNthAttack: (p) => `Every ${p.n ?? 3}${p.n === 2 ? 'nd' : p.n === 3 ? 'rd' : 'th'} attack`,
};

export function describePassive(p: PassiveDef, star?: Star, nameOf?: NameOf): string {
  if (p.desc) return p.desc;
  const parts: string[] = [];
  if (p.stats) for (const [k, val] of Object.entries(p.stats)) parts.push(statText(k as CombatStatKey, v(val, star), false, '+'));
  if (p.pctStats) for (const [k, val] of Object.entries(p.pctStats)) parts.push(statText(k as CombatStatKey, v(val, star), true, '+'));
  const statPart = parts.join(', ');
  const steps = (p.steps ?? []).map((s) => describeStep(s, star, nameOf)).join(' ');
  const trig = TRIGGERS[p.trigger](p);
  const body = [statPart, steps].filter(Boolean).join('. ');
  return trig ? `${trig}: ${body}` : body;
}
