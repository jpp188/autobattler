/**
 * The run's top bar: act, Hero HP, gold and artifact icons. Shown on every
 * run screen so the Hero's health (the run's life) is always visible.
 */
import Phaser from 'phaser';
import { actName, heroMaxHp, type RunState } from '../core/run';
import { getArtifact } from '../data';
import { artifactTexture } from '../render/icons';
import { GAME_W } from '../scenes/layout';
import { C, T } from './theme';
import { Bar, label, withTooltip, type Tooltip } from './widgets';

export class RunHud {
  container: Phaser.GameObjects.Container;
  private hpBar: Bar;
  private hpText: Phaser.GameObjects.Text;
  private goldText: Phaser.GameObjects.Text;
  private actText: Phaser.GameObjects.Text;
  private artifacts: Phaser.GameObjects.Container;

  constructor(
    private scene: Phaser.Scene,
    private run: RunState,
    private tip: Tooltip,
    subtitle = '',
  ) {
    const bg = scene.add.rectangle(0, 0, GAME_W, 18, C.bgDeep, 0.92).setOrigin(0, 0);
    const line = scene.add.rectangle(0, 18, GAME_W, 1, C.borderDark).setOrigin(0, 0);
    this.actText = label(scene, 6, 5, actName(run.act) + (subtitle ? `  ·  ${subtitle}` : ''), { color: T.title });
    const heart = scene.add.image(300, 5, 'icon_heart').setOrigin(0, 0);
    this.hpBar = new Bar(scene, 311, 6, 70, 6, C.hp);
    this.hpText = label(scene, 385, 5, '', { color: T.text });
    const coin = scene.add.image(440, 5, 'icon_gold').setOrigin(0, 0);
    this.goldText = label(scene, 451, 4, '', { font: 'title', color: T.gold });
    this.artifacts = scene.add.container(0, 0);
    this.container = scene.add.container(0, 0, [bg, line, this.actText, heart, this.hpBar, this.hpText, coin, this.goldText, this.artifacts]).setDepth(900);
    const hpZone = scene.add.zone(296, 1, 130, 16).setOrigin(0, 0);
    withTooltip(hpZone, tip, () => `Hero HP: ${this.run.heroHp}/${heroMaxHp(this.run)}\nYour Hero's HP is the run's life. If your Hero dies in battle, the run ends. Heals 10% after each win.`);
    this.container.add(hpZone);
    this.refresh();
  }

  refresh(): void {
    const max = heroMaxHp(this.run);
    this.hpBar.set(this.run.heroHp / max);
    this.hpBar.setColor(this.run.heroHp / max < 0.3 ? C.bad : C.hp);
    this.hpText.setText(`${this.run.heroHp}/${max}`);
    this.goldText.setText(String(this.run.gold));
    this.artifacts.removeAll(true);
    const n = this.run.artifacts.length;
    const maxShow = 11;
    const startX = GAME_W - 4 - Math.min(n, maxShow) * 13;
    this.run.artifacts.slice(0, maxShow).forEach((id, i) => {
      const def = getArtifact(id);
      const img = this.scene.add.image(startX + i * 13, 3, artifactTexture(this.scene, def)).setOrigin(0, 0);
      withTooltip(img, this.tip, () => `${def.name} (${def.tier})\n${def.desc}`);
      this.artifacts.add(img);
    });
    if (n > maxShow) this.artifacts.add(label(this.scene, GAME_W - 14, 10, `+${n - maxShow}`, { color: T.dim }));
  }

  setSubtitle(text: string): void {
    this.actText.setText(actName(this.run.act) + (text ? `  ·  ${text}` : ''));
  }
}
