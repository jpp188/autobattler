# Art in Packbound

Every picture in the game is drawn in code at boot, so the game runs with no
image files at all. Any of it can be replaced with real pixel art by dropping
PNGs into `public/sprites/` and listing them in `public/sprites/manifest.json`.

## How the code-drawn art works

| What | Where |
| --- | --- |
| Master palette (17 hue-shifted ramps × 6 shades, plus outline) | `src/art/palette.ts` |
| Unit and Hero sprites: entry point and biped rig | `src/art/drawUnit.ts` |
| Material buffer, shading, seams, outlines, rim light | `src/art/raster.ts` |
| Faces, hair, beast-folk heads, hats | `src/art/heads.ts` |
| Weapons, back gear, props, wings, tails, capes | `src/art/gear.ts` |
| Beasts, birds, spirits, serpents, spiders, golems | `src/art/beasts.ts` |
| Unit texture cache, frames, silhouettes | `src/render/unitSprites.ts` |
| Act backgrounds and ambient particles | `src/render/backdrops.ts` |
| Event illustrations | `src/render/eventArt.ts` |
| UI frames (9-slice), hexes, icons | `src/render/uiTextures.ts`, `src/render/icons.ts`, `src/render/mapIcons.ts` |

### The hi-bit sprite style

Unit art is "hi-bit": it stays at a low pixel count (32×32 units, 48×48
Heroes, so a unit fits a ~32 px hex) but packs in as much readable detail as
those pixels allow.

- **Material buffer.** Shapes are not painted straight to the canvas. They go
  into a small buffer (`raster.ts`) that stores a palette ramp, a shade (0-5)
  and a part id per pixel. Ellipses, rows and limbs are shaded from a
  pseudo-3D normal with one key light from the upper left, with ordered
  dithering only where a part asks for it (fur, big cloth areas).
- **Palette.** 17 ramps × 6 shades, hue-shifted: shadows lean violet and
  highlights lean warm. Shade 0 is reserved for coloured outlines and seams, 5
  for specular glints on metal, hair shine and eye highlights.
- **Selective outlines.** Every sprite keeps a dark outer outline so it reads
  on the board, but on the lit (top/left) side the outline takes the deepest
  shade of the colour it touches. Inside the sprite, a part drawn in front of
  another casts a contact seam (dark below/right, softer above/left) in the
  back part's own ramp, so arms, heads and gear separate without black lines.
- **Rim light** brightens the right-hand silhouette edge.
- **Detail kit.** Faces with lashes, iris colour and a white glint, eyebrows
  and mouths per expression; ears, beards, scars, eyepatches, spectacles,
  war paint, tusks; hands; sashes with knots, armour lacing, plate rivets,
  hakama pleats, crossed collars; patterns (tiger stripes, uroko scales,
  seigaiha waves, clouds, sakura, stars, patches, flames) that keep the
  shading of the cloth they sit on.

Everything is a pure function of the look and the frame (no randomness), and
all ~60 sprites × 5 frames draw in well under a second at boot.

### SpriteLook

Each unit's data (`src/data/units.ts`, `heroes.ts`, `enemies.ts`, `summons.ts`)
has a `look` (type in `src/core/types.ts`). Required fields: a body type
(`robe`, `armor`, `light`, `beast`, `oni`, `spirit`, `bird`, `serpent`,
`slime`, `golem`, `skeleton`, `spider`) and palette ramps for `skin`, `hair`,
`main` and `accent`. Everything else is optional and defaults to a plain look:

| Field | What it does |
| --- | --- |
| `build`, `height`, `big` | Silhouette: slim / normal / heavy, short / normal / tall, larger overall |
| `species` | Head and body shape for beasts and beast-folk: fox, tanuki, monkey, kappa, rabbit, tengu, crow, komainu, lion, tiger, boar, kirin, nue, crane, phoenix; spirits: flame, wisp, lantern (chochin), kodama; golems: statue, toro (stone lantern) |
| `lower`, `trim`, `eyes` | Extra ramps: hakama/trousers, trims and linings, iris colour |
| `hairStyle` | long, short, bun, spiky, ponytail, twin, hood, none, mane, topknot, wild, bob |
| `face` | Expression: calm, fierce, grin, stern, sly, serene, wild |
| `beard`, `mark` | Beards (stubble, goatee, long, full, mustache); scar, eyepatch, war paint, tusks, third eye, cloth mask, glasses, blush |
| `hat` | kasa, jingasa, crown, horns, horn, halo, ears, kitsune mask, kabuto helm, antlers, eboshi, tokin, headband, leaf, kappa dish, sun disc, crescent, imperial crown, hannya mask, kanzashi, hood |
| `weapon` | sword, katana, nodachi, bow, staff, shakujo, gohei, brush, kiseru, fan, spear, lance, naginata, kanabo, axe, mallet, claws, daggers, kusarigama, drumsticks, shield, orb |
| `back` | banner (sashimono), quiver, kappa shell, Raijin's drums, temple bell, sake bottle, flame ring, sheathed sword |
| `prop` | Off hand or belt: gourd, scroll, sake cup, conch, floating talismans, loot sack, lantern |
| `neck`, `pauldron`, `sash`, `emblem` | Prayer beads, bib, fur ruff, collar; round / layered / spiked / fur shoulders; belt styles; chest crests (mon, star, sun, moon, tomoe, flame, yamabushi pompoms) |
| `pattern` | Cloth or fur pattern (see above) |
| `extra`, `wingStyle`, `tailStyle`, `tails`, `heads` | tail, wings, scarf, cape, aura, celestial ribbons; feather / crow / bat / cloud wings; fluffy / thin / snake / curl / plume tails; tail and head counts |

Hero skins are partial `look` overrides, so a skin can change colours and
also swap a hat, pattern, weapon or back piece.

To check sprites, run `node scripts/contact-sheet.mjs`: it draws every unit,
enemy, summon and Hero skin, frames 0-4 at 4× zoom, into
`screenshots/contact-sheet.png`, plus a 1×/2× board-scale preview in
`screenshots/contact-sheet-1x.png`.

Units are 32×32 and Heroes 48×48. Every sprite has 5 frames in one strip:

| Frame | Use |
| --- | --- |
| 0, 1 | idle (breathing) |
| 2 | attack wind-up |
| 3 | attack strike |
| 4 | hit flash (white) |

The rarity glow (a soft outer outline) and the boss ground mark are added on
top by the composer.

## Replacing a unit sprite

1. Make a PNG sprite sheet: 5 square frames side by side, in the frame order
   above. A 32×32 unit is a 160×32 PNG; a 48×48 Hero is 240×48. Frames are
   read as squares of the image height, so other square sizes work too.
2. Name it after the unit's `sprite` key, for example `public/sprites/ronin.png`
   (the `sprite` field in the unit's data, not its `id`).
3. Add the key to the manifest:

```json
{
  "sprites": ["ronin"],
  "images": []
}
```

The loader prefers the PNG and falls back to the code-drawn sprite for any key
that is missing. Hero skins keep using the composer (they recolour the code
sprite), so supply separate sheets per skin if you replace a Hero.

## Replacing backgrounds and event pictures

List whole images under `"images"`:

- `bg_0` to `bg_3`: the Prologue and Acts I to III backgrounds, 640×360.
- `event_<art>`: an event illustration, 176×120, where `<art>` is the event's
  `art` field in `src/data/events.ts` (for example `event_shrine`).

## Style notes

- Use the palette in `src/art/palette.ts` so new art sits with the rest; shade
  with the hue-shifted ramps rather than plain darker/lighter colours.
- Keep a 1-pixel dark outline (`#120c1c`) around characters, tinted by the
  touching colour on the lit top/left side; use coloured seams, not black,
  inside the sprite.
- Light comes from the upper left; put the rim light on the right edge.
- Silhouette first: give each unit its own shape (hat, weapon, back piece,
  build) before relying on colour.
- Draw characters facing right; enemies are mirrored automatically.
- Leave 2 pixels free at the bottom of each frame for the ground shadow.
