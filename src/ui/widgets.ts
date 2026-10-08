/**
 * Small pixel UI kit: 9-slice panels, buttons, labels, bars, tooltips, modals.
 * Everything uses pointer events so it works with mouse and touch.
 */
import Phaser from 'phaser';
import { BODY, FONT, GAME_H, GAME_W } from '../scenes/layout';
import { C, T } from './theme';

export type TextOpts = {
  size?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  origin?: [number, number];
  font?: 'title' | 'body';
  stroke?: boolean;
  lineSpacing?: number;
};

/** Creates crisp pixel text. Title font is Press Start 2P, body is Tiny5. */
export function label(scene: Phaser.Scene, x: number, y: number, text: string, o: TextOpts = {}): Phaser.GameObjects.Text {
  const font = o.font === 'title' ? FONT : BODY;
  const size = o.size ?? 8;
  const t = scene.add.text(Math.round(x), Math.round(y), text, {
    fontFamily: font,
    fontSize: `${size}px`,
    color: o.color ?? T.text,
    align: o.align ?? 'left',
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: o.lineSpacing ?? (font === BODY ? 1 : 2),
    stroke: o.stroke ? '#07050b' : undefined,
    strokeThickness: o.stroke ? 2 : 0,
  });
  t.setResolution(1);
  if (o.origin) t.setOrigin(o.origin[0], o.origin[1]);
  return t;
}

export function title(scene: Phaser.Scene, x: number, y: number, text: string, color: string = T.title, size = 8): Phaser.GameObjects.Text {
  return label(scene, x, y, text, { font: 'title', size, color, origin: [0.5, 0], stroke: true });
}

/** 9-slice panel. Styles: 'panel' (gold frame), 'dark', 'inset', 'card'. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, style: 'panel' | 'dark' | 'inset' | 'card' = 'panel'): Phaser.GameObjects.NineSlice {
  const key = `ui_${style}`;
  const p = scene.add.nineslice(Math.round(x), Math.round(y), key, undefined, Math.round(w), Math.round(h), 6, 6, 6, 6);
  p.setOrigin(0, 0);
  return p;
}

let clickHook: (() => void) | null = null;
/** Lets the audio system play a click for every button. */
export function setClickHook(fn: () => void): void {
  clickHook = fn;
}

export class Button extends Phaser.GameObjects.Container {
  bg: Phaser.GameObjects.NineSlice;
  text: Phaser.GameObjects.Text;
  enabled = true;
  private handler: () => void;
  private pressed = false;
  readonly bw: number;
  private bh: number;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string, onClick: () => void, o: { size?: number; font?: 'title' | 'body'; color?: string } = {}) {
    super(scene, Math.round(x), Math.round(y));
    this.bw = w;
    this.bh = h;
    this.handler = onClick;
    this.bg = scene.add.nineslice(0, 0, 'ui_btn', undefined, w, h, 5, 5, 5, 5).setOrigin(0, 0);
    this.text = label(scene, Math.round(w / 2), Math.round(h / 2) - (o.font === 'body' ? 0 : 0), text, {
      font: o.font ?? 'title',
      size: o.size ?? 8,
      color: o.color ?? T.text,
      origin: [0.5, 0.5],
      align: 'center',
    });
    this.add([this.bg, this.text]);
    this.setSize(w, h);
    this.setInteractive(new Phaser.Geom.Rectangle(w / 2, h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    if (this.input) this.input.cursor = 'pointer';
    this.on('pointerover', () => this.enabled && !this.pressed && this.bg.setTexture('ui_btn_hover'));
    this.on('pointerout', () => {
      this.pressed = false;
      this.refresh();
    });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.pressed = true;
      this.bg.setTexture('ui_btn_down');
      this.text.y = Math.round(this.bh / 2) + 1;
    });
    this.on('pointerup', () => {
      if (!this.enabled || !this.pressed) return;
      this.pressed = false;
      this.refresh();
      clickHook?.();
      this.handler();
    });
    scene.add.existing(this);
  }

  private refresh(): void {
    this.bg.setTexture(this.enabled ? 'ui_btn' : 'ui_btn_off');
    this.text.y = Math.round(this.bh / 2);
    this.text.setAlpha(this.enabled ? 1 : 0.5);
  }

  setEnabled(on: boolean): this {
    this.enabled = on;
    this.refresh();
    return this;
  }

  setLabel(text: string): this {
    this.text.setText(text);
    return this;
  }

  setHandler(fn: () => void): this {
    this.handler = fn;
    return this;
  }

}

export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string, onClick: () => void, o?: { size?: number; font?: 'title' | 'body'; color?: string }): Button {
  return new Button(scene, x, y, w, h, text, onClick, o);
}

/** A simple horizontal bar (HP, charge, momentum). */
export class Bar extends Phaser.GameObjects.Container {
  back: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  extra: Phaser.GameObjects.Rectangle;
  w: number;
  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number, backColor: number = C.hpBack) {
    super(scene, x, y);
    this.w = w;
    this.back = scene.add.rectangle(0, 0, w, h, backColor).setOrigin(0, 0);
    this.fill = scene.add.rectangle(0, 0, w, h, color).setOrigin(0, 0);
    this.extra = scene.add.rectangle(0, 0, 0, h, C.shield).setOrigin(0, 0);
    this.add([this.back, this.fill, this.extra]);
    scene.add.existing(this);
  }
  set(frac: number, extraFrac = 0): this {
    const f = Phaser.Math.Clamp(frac, 0, 1);
    this.fill.width = Math.round(this.w * f);
    const e = Phaser.Math.Clamp(extraFrac, 0, 1 - f);
    this.extra.x = this.fill.width;
    this.extra.width = Math.round(this.w * e);
    return this;
  }
  setColor(c: number): this {
    this.fill.fillColor = c;
    return this;
  }
}

/** One tooltip per scene, shown on hover (mouse) or long-press (touch). */
export class Tooltip {
  private box: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.NineSlice;
  private text: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene) {
    this.bg = panel(scene, 0, 0, 10, 10, 'dark');
    this.text = label(scene, 6, 5, '', { wrap: 170 });
    this.box = scene.add.container(0, 0, [this.bg, this.text]).setDepth(5000).setVisible(false);
  }
  show(text: string, x: number, y: number, width = 170): void {
    this.text.setWordWrapWidth(width, true);
    this.text.setText(text);
    const w = Math.min(width, this.text.width) + 12;
    const h = this.text.height + 10;
    this.bg.setSize(w, h);
    let px = x + 10;
    let py = y + 10;
    if (px + w > GAME_W - 2) px = x - w - 6;
    if (py + h > GAME_H - 2) py = GAME_H - h - 2;
    this.box.setPosition(Math.max(2, Math.round(px)), Math.max(2, Math.round(py)));
    this.box.setVisible(true);
  }
  hide(): void {
    this.box.setVisible(false);
  }
  get visible(): boolean {
    return this.box.visible;
  }
}

/**
 * Attaches a tooltip to an interactive object: hover on desktop, press and
 * hold on touch. Returns the object for chaining.
 */
export function withTooltip<T extends Phaser.GameObjects.GameObject>(obj: T, tip: Tooltip, text: () => string, width?: number): T {
  if (!obj.input) obj.setInteractive();
  let timer: Phaser.Time.TimerEvent | null = null;
  const scene = obj.scene;
  obj.on('pointerover', (p: Phaser.Input.Pointer) => {
    if (!p.wasTouch) tip.show(text(), p.x, p.y, width);
  });
  obj.on('pointermove', (p: Phaser.Input.Pointer) => {
    if (!p.wasTouch && tip.visible) tip.show(text(), p.x, p.y, width);
  });
  obj.on('pointerout', () => {
    tip.hide();
    timer?.remove();
  });
  obj.on('pointerdown', (p: Phaser.Input.Pointer) => {
    if (p.wasTouch) {
      timer?.remove();
      timer = scene.time.delayedCall(320, () => tip.show(text(), p.x, p.y - 30, width));
    }
  });
  obj.on('pointerup', () => {
    timer?.remove();
    if (tip.visible) scene.time.delayedCall(1600, () => tip.hide());
  });
  return obj;
}

/** Modal dialog with a message and buttons. Blocks input behind it. */
export function modal(scene: Phaser.Scene, message: string, buttons: { text: string; onClick: () => void }[], width = 260): Phaser.GameObjects.Container {
  const shade = scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.6).setOrigin(0, 0).setInteractive();
  const text = label(scene, 0, 0, message, { wrap: width - 24, align: 'center', origin: [0.5, 0] });
  const h = text.height + 52;
  const x = Math.round((GAME_W - width) / 2);
  const y = Math.round((GAME_H - h) / 2);
  const bg = panel(scene, x, y, width, h, 'panel');
  text.setPosition(GAME_W / 2, y + 12);
  const c = scene.add.container(0, 0, [shade, bg, text]).setDepth(4000);
  const bw = Math.min(110, Math.floor((width - 24 - (buttons.length - 1) * 8) / buttons.length));
  const total = buttons.length * bw + (buttons.length - 1) * 8;
  buttons.forEach((b, i) => {
    const btn = button(scene, Math.round(GAME_W / 2 - total / 2 + i * (bw + 8)), y + h - 30, bw, 20, b.text, () => {
      c.destroy();
      b.onClick();
    });
    c.add(btn);
  });
  return c;
}

/** Draws a small coin icon + amount. */
export function goldText(scene: Phaser.Scene, x: number, y: number, amount: number | string): Phaser.GameObjects.Container {
  const icon = scene.add.image(0, 0, 'icon_gold').setOrigin(0, 0);
  const t = label(scene, 10, 0, String(amount), { font: 'title', color: T.gold });
  return scene.add.container(x, y, [icon, t]);
}
