/**
 * Scenes for non-battle map nodes and the post-battle rewards: Reward (also
 * used for artifact choices), Shop, Event, Rest and Treasure.
 */
import {
  boardTraitStatuses,
  buyHeal,
  buyRemove,
  buyShopArtifact,
  buyShopPack,
  chooseArtifactPick,
  chooseBossArtifact,
  chooseEvent,
  choiceAvailable,
  choiceUnitPurpose,
  chooseRewardPack,
  finishEvent,
  healServicePrice,
  heroMaxHp,
  leaveRest,
  leaveShop,
  leaveTreasure,
  openBonusPack,
  removeServicePrice,
  rerollCost,
  rerollShop,
  restHeal,
  restTrain,
  skipReward,
  takeTreasure,
  type RewardState,
} from '../core/run';
import { CONFIG } from '../core/config';
import { getArtifact, getEvent, getTrait } from '../data';
import { G } from '../game/state';
import { goRun } from '../game/router';
import { Sfx } from '../audio/sfx';
import { Music } from '../audio/music';
import { drawBackdrop } from '../render/backdrops';
import { eventArtTexture, EVENT_ART_H, EVENT_ART_W } from '../render/eventArt';
import { artifactCard, CARD_H, CARD_W, packWidget } from '../ui/cards';
import { openDeck } from '../ui/deck';
import { RunHud } from '../ui/hud';
import { T } from '../ui/theme';
import { TraitPanel } from '../ui/traitPanel';
import { button, label, modal, panel, title, withTooltip, type Button } from '../ui/widgets';
import { BaseScene } from './BaseScene';
import { GAME_W } from './layout';

/** Artifact card with a tooltip and a pick button underneath. */
function artifactChoice(scene: BaseScene, x: number, y: number, id: string, btnText: string, onPick: () => void): Button {
  const def = getArtifact(id);
  const card = artifactCard(scene, x, y, def);
  const zone = scene.add.zone(0, 0, CARD_W, CARD_H).setOrigin(0, 0);
  withTooltip(zone, scene.tip, () => `${def.name} (${def.tier})\n${def.desc}`);
  card.add(zone);
  return button(scene, x - 4, y + CARD_H + 4, CARD_W + 8, 18, btnText, onPick);
}

// ===================================================================== Reward

/** The reward object whose momentum change has already been animated. */
let animatedReward: RewardState | null = null;

export class RewardScene extends BaseScene {
  constructor() {
    super('Reward');
  }

  create(): void {
    this.setup();
    const run = G.run!;
    drawBackdrop(this, run.act, 'map');
    Music.play('map');
    if (run.screen === 'artifactPick') {
      this.drawArtifactPick();
      return;
    }
    const r = run.reward!;
    new RunHud(this, run, this.tip, 'Rewards');
    // Momentum, animated from the pre-fight values the first time.
    const traits = new TraitPanel(this, 4, 22, 116, this.tip);
    const first = animatedReward !== r;
    const shown: Record<string, number> = { ...run.momentum };
    if (first) for (const m of r.momentum) shown[m.trait] = m.before;
    traits.render(boardTraitStatuses(run), shown, 'MOMENTUM');
    if (first) {
      animatedReward = r;
      this.time.delayedCall(350, () => {
        for (const m of r.momentum) if (m.after !== m.before) traits.animateMomentum(m.trait, m.before, m.after, m.crossed.length > 0);
      });
    }

    const cx = 124 + (GAME_W - 124) / 2;
    const head = r.outcome === 'win' ? (r.kind === 'boss' ? 'BOSS DEFEATED!' : r.kind === 'elite' ? 'ELITE DEFEATED!' : 'VICTORY!') : r.outcome === 'timeout' ? 'TIME RAN OUT' : 'DEFEAT';
    title(this, cx, 26, head, r.outcome === 'win' ? T.gold : T.bad, 12);

    // Gold breakdown and healing.
    panel(this, 130, 44, 180, 36 + r.goldLines.length * 10, 'dark');
    label(this, 138, 50, 'GOLD', { font: 'title', color: T.title });
    r.goldLines.forEach(([name, n], i) => {
      label(this, 138, 64 + i * 10, name, { color: T.text });
      label(this, 302, 64 + i * 10, `+${n}`, { color: T.gold, origin: [1, 0] });
    });
    const yTot = 64 + r.goldLines.length * 10 + 2;
    this.add.rectangle(138, yTot, 164, 1, 0x4a3a5a).setOrigin(0, 0);
    label(this, 138, yTot + 3, 'Total', { color: T.title });
    label(this, 302, yTot + 3, `+${r.gold}`, { font: 'title', color: T.gold, origin: [1, 0] });
    const lines: string[] = [];
    if (r.heroHealed > 0) lines.push(`Your Hero healed ${r.heroHealed} HP.`);
    if (r.outcome === 'timeout') lines.push(`The fight dragged on: your Hero lost ${Math.round(CONFIG.timeoutHeroDamagePct * 100)}% HP.`);
    if (r.outcome === 'loss') lines.push('Your army fell, but your Hero escaped. The streak is broken.');
    const crossed = r.momentum.filter((m) => m.crossed.length);
    for (const m of crossed) lines.push(`${getTrait(m.trait).name} momentum reached ${Math.max(...m.crossed)}!`);
    label(this, 318, 50, lines.join('\n') || 'Your army stands ready.', { color: T.text, wrap: 192 });

    // Elite artifact.
    if (r.gainedArtifact) {
      const def = getArtifact(r.gainedArtifact);
      panel(this, 518, 44, 118, 92, 'dark');
      label(this, 577, 48, 'ARTIFACT', { font: 'title', color: T.title, origin: [0.5, 0] });
      const card = artifactCard(this, 552, 58, def).setScale(0.85);
      const zone = this.add.zone(0, 0, CARD_W, CARD_H).setOrigin(0, 0);
      withTooltip(zone, this.tip, () => `${def.name}\n${def.desc}`);
      card.add(zone);
    }

    // The choice area.
    if (r.bossArtifactChoices) {
      label(this, cx, 146, 'Choose a boss artifact:', { color: T.title, origin: [0.5, 0] });
      r.bossArtifactChoices.forEach((id, i) => {
        const x = cx - 110 + i * 80;
        artifactChoice(this, x, 160, id, 'TAKE', () => {
          chooseBossArtifact(run, i);
          Sfx.play('reveal_epic');
          G.saveRun();
          this.scene.restart();
        });
      });
      return;
    }
    if (r.bonusPacks.length) {
      label(this, cx, 146, `Bonus: ${r.bonusPacks.length > 1 ? `${r.bonusPacks.length} packs` : 'a Boss Pack'}! Open it before choosing your reward.`, { color: T.title, origin: [0.5, 0] });
      packWidget(this, cx, 162, run, r.bonusPacks[0], this.tip);
      button(this, cx - 60, 262, 120, 22, 'OPEN', () => {
        openBonusPack(run, G.isNewUnit);
        Sfx.play('packOpen');
        goRun(this);
      });
      return;
    }
    label(this, cx, 146, 'Choose one free pack:', { color: T.title, origin: [0.5, 0] });
    const n = r.packs.length;
    const spacing = Math.min(96, Math.floor(480 / n));
    r.packs.forEach((inst, i) => {
      const x = cx + (i - (n - 1) / 2) * spacing;
      packWidget(this, x, 160, run, inst, this.tip);
      button(this, x - 36, 262, 72, 20, 'CHOOSE', () => {
        chooseRewardPack(run, i, G.isNewUnit);
        Sfx.play('packOpen');
        goRun(this);
      });
    });
    label(this, cx, 290, 'Hold or hover a pack to see its odds.', { color: T.dim, origin: [0.5, 0] });
    button(this, cx - 50, 322, 100, 20, 'SKIP', () => {
      modal(this, 'Skip the free pack and return to the map?', [
        { text: 'SKIP', onClick: () => (skipReward(run), goRun(this)) },
        { text: 'BACK', onClick: () => undefined },
      ]);
    });
  }

  private drawArtifactPick(): void {
    const run = G.run!;
    const p = run.artifactPick!;
    new RunHud(this, run, this.tip, 'Artifact');
    title(this, GAME_W / 2, 40, p.title.toUpperCase(), T.gold, 10);
    label(this, GAME_W / 2, 60, 'Artifacts last for the whole run.', { color: T.dim, origin: [0.5, 0] });
    const n = p.options.length;
    p.options.forEach((id, i) => {
      const x = GAME_W / 2 - CARD_W / 2 + (i - (n - 1) / 2) * 90;
      artifactChoice(this, x, 100, id, 'TAKE', () => {
        chooseArtifactPick(run, i);
        Sfx.play('reveal_rare');
        goRun(this);
      });
    });
  }
}

// ===================================================================== Shop

export class ShopScene extends BaseScene {
  private hud!: RunHud;

  constructor() {
    super('Shop');
  }

  create(): void {
    this.setup();
    const run = G.run!;
    const s = run.shop!;
    drawBackdrop(this, run.act, 'map');
    Music.play('map');
    this.hud = new RunHud(this, run, this.tip, 'Shop');
    title(this, GAME_W / 2, 24, 'TRAVELLING MERCHANT', T.gold);

    // Packs.
    panel(this, 6, 36, GAME_W - 12, 132, 'dark');
    label(this, 14, 40, 'PACKS', { font: 'title', color: T.title });
    const n = s.packs.length;
    const spacing = Math.min(100, Math.floor((GAME_W - 40) / Math.max(1, n)));
    s.packs.forEach((item, i) => {
      const x = GAME_W / 2 + (i - (n - 1) / 2) * spacing;
      if (item.sold) {
        label(this, x, 90, 'SOLD', { font: 'title', color: T.dim, origin: [0.5, 0] });
        return;
      }
      packWidget(this, x, 46, run, item.inst, this.tip, `${item.price}G`);
      button(this, x - 30, 144, 60, 18, 'BUY', () => {
        if (!buyShopPack(run, i, G.isNewUnit)) return this.cantAfford();
        Sfx.play('gold');
        goRun(this);
      }).setEnabled(run.gold >= item.price);
    });

    // Artifacts.
    panel(this, 6, 172, 236, 150, 'dark');
    label(this, 14, 176, 'ARTIFACTS', { font: 'title', color: T.title });
    if (!s.artifacts.length) label(this, 14, 196, 'The merchant has no artifacts\nfor sale yet. Come back in Act I.', { color: T.dim });
    s.artifacts.forEach((a, i) => {
      const x = 24 + i * 110;
      if (a.sold) {
        label(this, x + CARD_W / 2, 230, 'SOLD', { font: 'title', color: T.dim, origin: [0.5, 0] });
        return;
      }
      artifactChoice(this, x + 10, 190, a.id, `BUY ${a.price}G`, () => {
        if (!buyShopArtifact(run, i)) return this.cantAfford();
        Sfx.play('gold');
        G.saveRun();
        this.scene.restart();
      }).setEnabled(run.gold >= a.price);
    });

    // Services.
    panel(this, 246, 172, 388, 150, 'dark');
    label(this, 254, 176, 'SERVICES', { font: 'title', color: T.title });
    const healPrice = healServicePrice(run);
    const max = heroMaxHp(run);
    label(this, 254, 192, `Herbal Tea: your Hero heals ${Math.round(CONFIG.economy.healServicePct * 100)}% of max HP (${run.heroHp}/${max} now). Once per shop.`, { color: T.text, wrap: 260 });
    button(this, 530, 192, 96, 20, s.healUsed ? 'DONE' : `HEAL ${healPrice}G`, () => {
      if (!buyHeal(run)) return this.cantAfford();
      Sfx.play('gold');
      G.saveRun();
      this.scene.restart();
    }).setEnabled(!s.healUsed && run.gold >= healPrice && run.heroHp < max);
    const removePrice = removeServicePrice(run);
    label(this, 254, 226, `Farewell Rite: send away a unit you no longer need (no gold back). Keeps packs from merging into weak units. Once per shop.`, { color: T.text, wrap: 260 });
    button(this, 530, 226, 96, 20, s.removeUsed ? 'DONE' : `REMOVE ${removePrice}G`, () =>
      openDeck(this, run, {
        title: 'FAREWELL RITE',
        subtitle: `Choose a unit to send away for ${removePrice} gold.`,
        filter: (u) => !u.hero,
        pickLabel: 'SEND AWAY',
        onPick: (u) => {
          if (!buyRemove(run, u.uid)) return this.cantAfford();
          Sfx.play('gold');
          G.saveRun();
          this.scene.restart();
        },
      }),
    ).setEnabled(!s.removeUsed && run.gold >= removePrice && run.roster.units.some((u) => !u.hero && u.loc.at !== 'pending'));
    label(this, 254, 262, 'Sell units for gold from your deck.', { color: T.text, wrap: 260 });
    button(this, 530, 260, 96, 20, 'SELL UNITS', () =>
      openDeck(this, run, {
        title: 'SELL UNITS',
        subtitle: 'Tap a unit, then sell it.',
        allowSell: true,
        onChange: () => {
          G.saveRun();
          this.hud.refresh();
        },
        onClose: () => this.scene.restart(),
      }),
    );

    const cost = rerollCost(run);
    button(this, 14, 330, 150, 22, cost ? `REROLL PACKS ${cost}G` : 'REROLL PACKS FREE', () => {
      if (!rerollShop(run)) return this.cantAfford();
      Sfx.play('gold');
      G.saveRun();
      this.scene.restart();
    }).setEnabled(run.gold >= cost);
    label(this, 172, 336, 'Reroll costs rise each time.', { color: T.dim });
    button(this, GAME_W - 130, 330, 120, 22, 'LEAVE', () => {
      leaveShop(run);
      Sfx.play('travel');
      goRun(this);
    });
  }

  private cantAfford(): void {
    Sfx.play('error');
    this.cameras.main.shake(80, 0.004);
  }
}

// ===================================================================== Event

export class EventScene extends BaseScene {
  constructor() {
    super('Event');
  }

  create(): void {
    this.setup();
    const run = G.run!;
    const ev = run.event!;
    const def = getEvent(ev.id);
    drawBackdrop(this, run.act, 'map');
    Music.play('map');
    new RunHud(this, run, this.tip, 'Event');
    panel(this, 10, 26, EVENT_ART_W + 12, EVENT_ART_H + 12, 'card');
    this.add.image(16, 32, eventArtTexture(this, def.art)).setOrigin(0, 0);
    panel(this, 204, 26, 430, 326, 'dark');
    title(this, 214, 34, def.title.toUpperCase(), T.gold, 8).setOrigin(0, 0);
    const text = label(this, 214, 50, def.text, { color: T.text, wrap: 410 });
    let y = text.y + text.height + 10;
    if (ev.result) {
      label(this, 214, y, ev.result, { color: T.title, wrap: 410 });
      button(this, 419 - 60, 316, 120, 22, 'CONTINUE', () => {
        finishEvent(run, G.isNewUnit);
        goRun(this);
      });
      return;
    }
    def.choices.forEach((c, i) => {
      const ok = choiceAvailable(run, ev.id, i);
      button(this, 214, y, 150, 20, c.label.toUpperCase(), () => this.choose(i)).setEnabled(ok);
      let hint = c.hint;
      if (!ok && c.requires) {
        const need: string[] = [];
        if (c.requires.gold !== undefined) need.push(`${c.requires.gold} gold`);
        if (c.requires.units !== undefined) need.push(`${c.requires.units} unit${c.requires.units > 1 ? 's' : ''} besides your Hero`);
        if (c.requires.heroHpPct !== undefined) need.push(`Hero above ${c.requires.heroHpPct}% HP`);
        hint += ` (Needs ${need.join(', ')}.)`;
      }
      const h = label(this, 372, y + 2, hint, { color: ok ? T.text : T.dim, wrap: 254 });
      y += Math.max(26, h.height + 10);
    });
  }

  private choose(i: number): void {
    const run = G.run!;
    const ev = run.event!;
    const purpose = choiceUnitPurpose(ev.id, i);
    const apply = (uid?: number) => {
      chooseEvent(run, i, uid, G.isNewUnit);
      Sfx.play(run.heroHp <= 0 ? 'defeat' : 'reveal_uncommon');
      if (run.screen === 'over') {
        goRun(this);
        return;
      }
      G.saveRun();
      this.scene.restart();
    };
    if (!purpose) return apply();
    const titles = { sacrifice: 'CHOOSE A UNIT TO GIVE UP', train: 'CHOOSE A UNIT TO TRAIN', starUp: 'CHOOSE A UNIT TO STAR UP' };
    openDeck(this, run, {
      title: titles[purpose],
      subtitle: getEvent(ev.id).choices[i].hint,
      filter: (u) => !u.hero && (purpose !== 'starUp' || u.star < 3),
      pickLabel: 'CHOOSE',
      onPick: (u) => apply(u.uid),
    });
  }
}

// ===================================================================== Rest

export class RestScene extends BaseScene {
  constructor() {
    super('Rest');
  }

  create(): void {
    this.setup();
    const run = G.run!;
    const rest = run.rest!;
    drawBackdrop(this, run.act, 'map');
    Music.play('map');
    new RunHud(this, run, this.tip, 'Rest');
    title(this, GAME_W / 2, 30, 'A QUIET CAMPFIRE', T.gold, 10);
    this.add.image(GAME_W / 2, 92, 'node_rest').setScale(4);
    if (rest.done) {
      label(this, GAME_W / 2, 140, rest.text ?? '', { color: T.title, wrap: 360, align: 'center', origin: [0.5, 0] });
      button(this, GAME_W / 2 - 60, 300, 120, 22, 'CONTINUE', () => {
        leaveRest(run);
        Sfx.play('travel');
        goRun(this);
      });
      return;
    }
    label(this, GAME_W / 2, 130, 'Choose one:', { color: T.text, origin: [0.5, 0] });
    const max = heroMaxHp(run);
    const heal = Math.min(max - run.heroHp, Math.round(max * CONFIG.hero.restHealPct));
    panel(this, 120, 148, 190, 130, 'dark');
    title(this, 215, 156, 'REST', T.title);
    label(this, 215, 172, `Your Hero recovers ${Math.round(CONFIG.hero.restHealPct * 100)}% of max HP.\n(+${heal} HP, now ${run.heroHp}/${max})`, { color: T.text, wrap: 170, align: 'center', origin: [0.5, 0] });
    button(this, 165, 246, 100, 22, 'REST', () => {
      restHeal(run);
      Sfx.play('reveal_uncommon');
      G.saveRun();
      this.scene.restart();
    });
    panel(this, 330, 148, 190, 130, 'dark');
    title(this, 425, 156, 'TRAIN', T.title);
    label(this, 425, 172, `A unit gains +${CONFIG.hero.trainHpBonus} HP and +${CONFIG.hero.trainAdBonus} Attack for the rest of the run. Your Hero can train too (half Attack).`, { color: T.text, wrap: 170, align: 'center', origin: [0.5, 0] });
    button(this, 375, 246, 100, 22, 'TRAIN', () =>
      openDeck(this, run, {
        title: 'CHOOSE A UNIT TO TRAIN',
        subtitle: `+${CONFIG.hero.trainHpBonus} HP and +${CONFIG.hero.trainAdBonus} Attack. Training carries over when the unit merges.`,
        pickLabel: 'TRAIN',
        onPick: (u) => {
          restTrain(run, u.uid);
          Sfx.play('reveal_uncommon');
          G.saveRun();
          this.scene.restart();
        },
      }),
    );
  }
}

// ===================================================================== Treasure

export class TreasureScene extends BaseScene {
  constructor() {
    super('Treasure');
  }

  create(): void {
    this.setup();
    const run = G.run!;
    const t = run.treasure!;
    drawBackdrop(this, run.act, 'map');
    Music.play('map');
    const hud = new RunHud(this, run, this.tip, 'Treasure');
    title(this, GAME_W / 2, 30, 'A HIDDEN CACHE', T.gold, 10);
    const chest = this.add.image(GAME_W / 2, 110, 'node_treasure').setScale(5);
    const cont = button(this, GAME_W / 2 - 60, 316, 120, 22, t.taken ? 'CONTINUE' : 'OPEN', () => {
      if (!t.taken) {
        takeTreasure(run);
        G.saveRun();
        Sfx.play('reveal_rare');
        Sfx.play('gold');
        hud.refresh();
        this.tweens.add({ targets: chest, scale: 5.6, yoyo: true, duration: 120 });
        this.reveal();
        cont.setLabel('CONTINUE');
        return;
      }
      leaveTreasure(run);
      Sfx.play('travel');
      goRun(this);
    });
    if (t.taken) this.reveal();
  }

  private reveal(): void {
    const t = G.run!.treasure!;
    label(this, GAME_W / 2, 160, `+${t.gold} gold`, { font: 'title', color: T.gold, origin: [0.5, 0] });
    if (t.artifact) {
      const def = getArtifact(t.artifact);
      const card = artifactCard(this, GAME_W / 2 - CARD_W / 2, 180, def);
      const zone = this.add.zone(0, 0, CARD_W, CARD_H).setOrigin(0, 0);
      withTooltip(zone, this.tip, () => `${def.name}\n${def.desc}`);
      card.add(zone);
      card.setAlpha(0);
      this.tweens.add({ targets: card, alpha: 1, y: { from: 190, to: 180 }, duration: 300 });
      label(this, GAME_W / 2, 270, 'Artifacts last for the whole run.', { color: T.dim, origin: [0.5, 0] });
    }
  }
}

