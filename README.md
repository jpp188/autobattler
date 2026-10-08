# Packbound

A roguelike autobattler: TFT-style hex battles inside a Slay the Spire-style
run, where every unit you field comes out of a pack. Pick a Hero, open packs,
merge copies into 2★ and 3★ units, ride your trait momentum through three acts
of a high-fantasy Eastern world, and keep your Hero alive: their HP is the run.

Built with TypeScript, Vite and Phaser 3. All art is drawn in code and all
sound is synthesised with the Web Audio API, so there are no asset files to
fetch besides two bundled pixel fonts.

## Running it

Requires Node 18 or newer.

```bash
npm install
npm run dev        # play at http://localhost:5173
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
npm test           # Vitest unit and simulation tests
npm run sim        # bot plays 50 full runs from Act I and reports win rate (npm run sim -- 200 7 for 200 runs from seed 7, add --prologue to include it)
npm run battle     # prints a headless battle log
npm run e2e        # builds, then clicks through the game in Chromium at 3 viewports
```

`npm run e2e` uses Playwright. If its browser is not installed yet, run
`npx playwright install chromium` once. Screenshots land in `screenshots/`.

The build is a static site in `dist/` with relative paths, so it can be
hosted anywhere (itch.io, GitHub Pages, a plain web server).

## Desktop app (Windows .exe)

The same build also runs as a desktop app through Electron
(`electron/main.cjs`).

```bash
npm run desktop    # build, then open the game in a desktop window
npm run dist:win   # build Packbound.exe into release/Packbound-win32-x64/ and zip it
```

`dist:win` works from Windows, macOS or Linux (no wine needed). To play, unzip
`Packbound-win32-x64.zip` and run `Packbound.exe`; keep the other files in the
folder next to it. F11 toggles fullscreen. The exe is not code-signed, so
Windows SmartScreen may warn on first launch ("More info", then "Run anyway").
Saves are stored per Windows user.

## Controls

Everything works with a mouse or with touch alone.

| Action | Mouse | Touch |
| --- | --- | --- |
| Keep a unit from a pack | Flip the cards, click the one to keep, then KEEP | Same, with taps |
| Place or move a unit | Drag it to a blue hex or a bench slot | Tap the unit, then tap a hex or slot (dragging works too) |
| Inspect a unit | Click it | Tap it |
| Read a tooltip (traits, packs and their odds, artifacts, map nodes) | Hover | Press and hold |
| Sell a unit | Select it, then SELL (or from the deck view) | Same |
| Fill the board with your best units | AUTO | AUTO |
| Battle speed | 1x / 2x / 4x, or SKIP | Same |
| Scroll the map | Drag or mouse wheel | Drag |
| Settings (volume, mute, speed, screen shake) | Gear icon in the top bar, or Settings on the title | Same |

## How a run works

1. Choose one of 3 Heroes (each with 2 traits, 2 passives, an ultimate and a
   run perk) and a skin.
2. Pick a starter pack: a themed pack of Commons sharing a trait, or a mixed
   Uncommon pack. It shows 4 units and you keep 2.
3. Your first run on a save starts with the Prologue (5 nodes), which teaches
   placing units, shopping, merging, traits and bosses. Every later run skips
   it and starts in Act I with the Prologue's board slot already earned.
   Acts I to III are each a branching 15-floor map with battles, elites,
   shops, events, rest spots, treasure and one of two bosses.
4. After every fight you choose a free pack. Every pack reveals its cards and
   you keep only 1 of them, so pick for merges and traits. Traits you keep
   active build momentum, which improves your pulls, stats and pack choices.
5. Your board starts with 5 slots (the Hero included). Each boss you beat
   adds 1 slot; only a couple of rare artifacts add more.
6. Enemy groups grow as you go deeper: extra enemies join fights every few
   floors, more in later acts, and they turn 2★ further in.
7. If your Hero dies, the run ends. Beat the Act III boss to win.

Meta progress (collection, achievements, skins) is cosmetic and never changes
run difficulty.

## Project layout

```
src/core/    game rules, no Phaser imports: combat sim, runs, packs, maps, momentum, saves, bot
src/data/    all content as data: units, heroes, traits, packs, artifacts, events, encounters, achievements
src/art/     palette and the pixel-art composer for units
src/render/  textures: UI frames, icons, backgrounds, event art, unit views
src/audio/   Web Audio engine, effects and music
src/ui/      widgets, HUD, trait panel, cards, inspect panel, deck view
src/scenes/  Phaser scenes (title, hero select, map, battle, packs, shop, ...)
tests/       Vitest suites
scripts/     sim.ts (bot runs), battle.ts (battle log), e2e.mjs (Playwright)
```

All tuning numbers (stat multipliers, momentum formula, economy, enemy
scaling, map shape) live in `src/core/config.ts`. All randomness goes through
the seeded RNG in `src/core/rng.ts`, so a run and every battle replay exactly
from their seeds. Runs save to localStorage after every node; meta progress is
saved separately. Both saves are versioned with a migration table in
`src/core/save.ts`.

## Adding content

Content is plain data. New entries show up in packs, the collection, tooltips,
the bot and the tests without touching game code. Run `npm test` afterwards:
the data and content tests check counts, references and that every unit can
fight.

### A unit

Add an entry to `UNITS` in `src/data/units.ts`:

```ts
{
  id: 'paper_crane',              // unique id
  name: 'Paper Crane',
  rarity: 'uncommon',              // common | uncommon | rare | epic | legendary
  role: 'caster',                  // tank | fighter | assassin | marksman | caster | support
  origin: 'celestial',             // an Origin trait id from src/data/traits.ts
  cls: 'mystic',                   // a Class trait id
  flavor: 'Folded from a prayer.',
  sprite: 'paper_crane',           // art key (see "Replacing the art")
  look: { body: 'bird', skin: 'steel', hair: 'none', main: 'steel', accent: 'red', weapon: 'none', extra: 'wings' },
  stats: makeStats('caster', 'uncommon'),
  passives: [ /* 1 for Common/Uncommon, 2 for Rare/Epic, 3 for Legendary */
    { name: 'Origami Ward', trigger: 'battleStart', steps: [step(S.self, [E.shield([100, 180, 330], 5)], 'shield')] },
  ],
  ult: {
    name: 'Thousand Cranes',
    steps: [step(S.randomEnemies(3), [E.magic([120, 220, 400])], 'star')],
    star3Steps: [step(S.allEnemies, [E.stun(0.5)])],   // optional extra effect at 3★
  },
},
```

- Values written as `[a, b, c]` are per star level.
- `S` (targets), `E` (effects) and `step` come from `src/data/dsl.ts`. Their
  text in tooltips is generated automatically by `src/core/describe.ts`.
- Passive triggers: `static`, `battleStart`, `onAttack`, `onHitTaken`,
  `onKill`, `onCast`, `interval`, `hpBelow`, `allyDeath`, `everyNthAttack`.
- Enemy-only units go in `src/data/enemies.ts` and are placed in fights by
  `src/data/encounters.ts`.

### A pack

Add an entry to `PACKS` in `src/data/packs.ts`:

```ts
{
  id: 'lantern_pack',
  name: 'Lantern Pack',
  desc: 'Keep 1 of 4 units. One is Rare or better.',
  color: '#e8504a',                                  // pack art colour
  icon: 'card',
  cards: 4,
  keep: 1,                                           // optional: cards the player keeps (default 1)
  weights: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 },
  guaranteed: [{ slot: 3, minRarity: 'rare' }],      // optional
  filter: { roles: ['caster', 'support'] },          // optional: traits, rarities, roles
  special: 'none',                                   // or trait, origin, class, duo, duplicate, mirror, momentum, hero, artifact, ...
  price: 10,
  appears: ['shop', 'reward'],                       // shop, reward, elite, boss, event, treasure, starter, prologue
  minAct: 1,                                         // optional
},
```

The odds tooltip on every pack is calculated from this definition, momentum
and artifacts, so it is always accurate.

### An artifact

Add an entry to `ARTIFACTS` in `src/data/artifacts.ts`:

```ts
{ id: 'paper_charm', name: 'Paper Charm', tier: 'uncommon', icon: 'seal', color: '#f4f0e0',
  desc: 'All your units gain +10% Atk Speed.', effects: [{ k: 'teamStats', stats: { as: 10 }, pct: true }] },
```

Effect kinds (`boardLimit`, `benchSlots`, `goldPerWin`, `traitOdds`,
`rarityLuck`, `startCharge`, `heroHealAfterFight`, `shopDiscount`,
`teamStats`, `heroStats`, `actStarUp`, `heroMaxHp`, `extraPackChoice`,
`interest`, `sellBonus`, `unitStats` and `unitPassive` with a unit filter
(roles, front or back row, max star, Hero only), `enemyStats`, `restHeal`,
`freeRerolls`) are listed in `src/core/types.ts`; tiers are
`common`, `uncommon`, `rare` and `boss`. The icon is drawn from `icon` and
`color`.

Events (`src/data/events.ts`), traits (`src/data/traits.ts`), encounters and
achievements follow the same pattern.

## Replacing the art

The game draws everything in code, but any sprite, background or event
picture can be swapped for a real PNG: put the file in `public/sprites/` and
list its key in `public/sprites/manifest.json`. A unit sheet is 5 square
frames in a row (idle, idle, wind-up, strike, hit flash). See [ART.md](ART.md)
for sizes, keys and style notes.

## Credits

- Fonts: Press Start 2P by CodeMan38 and Tiny5 by Stefan Schmidt, both under
  the SIL Open Font License (`public/fonts/`).
- Everything else (code, pixel art, sound and music) is generated by this
  project's code.
