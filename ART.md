# Art in Packbound

Every picture in the game is drawn in code at boot, so the game runs with no
image files at all. Any of it can be replaced with real pixel art by dropping
PNGs into `public/sprites/` and listing them in `public/sprites/manifest.json`.

## How the code-drawn art works

| What | Where |
| --- | --- |
| Master palette (13 ramps × 4 shades, plus outline) | `src/art/palette.ts` |
| Unit and Hero sprites (the pixel-art composer) | `src/art/drawUnit.ts` |
| Unit texture cache, frames, silhouettes | `src/render/unitSprites.ts` |
| Act backgrounds and ambient particles | `src/render/backdrops.ts` |
| Event illustrations | `src/render/eventArt.ts` |
| UI frames (9-slice), hexes, icons | `src/render/uiTextures.ts`, `src/render/icons.ts`, `src/render/mapIcons.ts` |

Each unit's data (`src/data/units.ts`, `heroes.ts`, `enemies.ts`, `summons.ts`)
has a `look` that the composer turns into pixels: a body type (`robe`, `armor`,
`light`, `beast`, `oni`, `spirit`, `bird`, `serpent`, `slime`, `golem`), palette
ramps for skin, hair, clothing and accent, plus hair style, hat, weapon and an
extra (tail, wings, scarf, cape, aura). Hero skins are partial `look` overrides,
so a new skin is usually just a different set of ramp names.

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

- Use the palette in `src/art/palette.ts` so new art sits with the rest.
- Keep a 1-pixel dark outline (`#120c1c`) around characters.
- Draw characters facing right; enemies are mirrored automatically.
- Leave 2 pixels free at the bottom of each frame for the ground shadow.
