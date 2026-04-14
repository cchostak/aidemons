# Asset Shortlist

This is the current shortlist for open source / openly licensed art that fits `Aidemons`.

## Recommendation

Use a `2D CC0-first` stack for the current Phaser client.

Why:

- It matches the current web tech without forcing an engine pivot.
- CC0 packs keep the legal overhead low while we prototype fast.
- We can still get a creature-heavy MMO look with terrain, monsters, pets, icons, and HUD pieces.

Treat LPC as an optional phase-two path for paper-doll customization, not the default starting point.

## Best Fit For The Current Repo

### Terrain and world tiles

- `Kenney Roguelike/RPG pack`
  - Best all-round starting pack for towns, terrain, interiors, furniture, and misc UI pieces.
  - Link: https://www.kenney.nl/assets/roguelike-rpg-pack
  - License: CC0

- `Kenney Tiny Dungeon`
  - Good for compact dungeon zones, caves, crypts, and enemy test rooms.
  - Link: https://kenney.nl/assets/tiny-dungeon
  - License: CC0

- `Kenney Isometric Miniature Dungeon`
  - Useful if we want a 2D isometric experiment without jumping into full 3D.
  - Link: https://www.kenney.nl/assets/isometric-miniature-dungeon
  - License: CC0

### Player and NPC characters

- `Kenney Roguelike Characters`
  - Best low-friction option for a first playable character set.
  - Link: https://kenney.nl/assets/roguelike-characters
  - License: CC0

### Monsters and pets

- `Kenney Monster Builder Pack`
  - Good base for enemy families, pet variations, and fast recolor pipelines.
  - Link: https://kenney.nl/assets/monster-builder-pack
  - License: CC0

- `OpenGameArt Tiny Creatures`
  - Strong supplement for creature density: 180 sprites, 100+ monsters, 50+ animals.
  - Compatible with Kenney's Tiny Dungeon / Tiny Town style.
  - Link: https://opengameart.org/content/tiny-creatures
  - License: CC0

### HUD, menus, and interaction cues

- `Kenney UI Pack`
  - Good raw material for windows, buttons, frames, bars, and menu widgets.
  - Link: https://kenney.nl/assets/ui-pack
  - License: CC0

- `Kenney Input Prompts`
  - Useful for keyboard, mouse, gamepad, and touch glyphs.
  - Link: https://kenney.nl/assets/input-prompts
  - License: CC0

- `Kenney UI Audio`
  - Small but useful click / switch / confirm sounds for the HUD.
  - Link: https://www.kenney.nl/assets/ui-audio
  - License: CC0

- `Game-icons.net`
  - Excellent for spell, inventory, pet, loot, and status-effect icons.
  - Link: https://game-icons.net/
  - License: CC BY 3.0
  - Note: requires attribution, so do not mix it into the repo casually without a credits file.

## Optional Customization Route

### LPC for paper-doll gear and class variety

- `Universal LPC Spritesheet Character Generator`
  - Link: https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator
  - Great if we want wearable gear layers, more character variety, and old-school RPG animation sets.
  - Tradeoff: licensing is mixed. Some pieces are CC0, but others require attribution, share-alike, or other obligations.

- `[LPC] Terrains`
  - Link: https://opengameart.org/content/lpc-terrains
  - Great terrain coverage for grass, dirt, snow, water, sand, rock, lava, and transitions.
  - Tradeoff: attribution-heavy compared with the Kenney route.

Use LPC only if we are ready to carry a proper `CREDITS` workflow.

## 3D Upgrade Path

If we later move from a 2D Phaser presentation to a 3D browser client, this is the cleanest path I found.

- `Kay Lousberg Characters : Adventurers`
  - Link: https://kaylousberg.com/game-assets/characters-adventurers
  - CC0

- `Kay Lousberg Character Animations`
  - Link: https://kaylousberg.com/game-assets/character-animations
  - CC0

- `Kay Lousberg Forest Nature Pack`
  - Link: https://kaylousberg.com/game-assets/forest-nature-pack
  - CC0

- `Kay Lousberg Medieval Hexagon`
  - Link: https://www.kaylousberg.com/game-assets/medieval-hexagon
  - CC0

- `ambientCG`
  - Link: https://ambientcg.com/gallery
  - Use for CC0 materials and environment textures.

- `Poly Haven`
  - Link: https://polyhaven.com/
  - Use for CC0 HDRIs, materials, and higher-quality environment support assets.

## Practical Call

If we want to move fast, start with this exact bundle:

1. `Kenney Roguelike/RPG pack`
2. `Kenney Roguelike Characters`
3. `Kenney Monster Builder Pack`
4. `OpenGameArt Tiny Creatures`
5. `Kenney UI Pack`
6. `Kenney Input Prompts`
7. `Kenney UI Audio`

That gives us enough to build:

- one outdoor zone
- one dungeon test room
- one playable character
- several enemy and pet prototypes
- a usable HUD and menu shell
- proper input glyphs
- basic UI feedback audio

## License Notes

- `Safest for fast commercial prototyping:` CC0-only packs.
- `Kenney:` CC0 across asset pages, attribution not required.
- `Tiny Creatures:` CC0.
- `Game-icons.net:` CC BY 3.0, attribution required.
- `LPC generator / LPC terrains:` useful, but mixed-license and attribution-heavy.
- `Kay Lousberg, ambientCG, Poly Haven:` strong CC0 options if we move to 3D.

## Next Step

If we want, the next sensible move is to vendor a small `CC0-only starter pack` into `apps/web/public/assets` and wire:

- one terrain tileset
- one player spritesheet
- one creature set
- one icon sheet

into the Phaser scene so the prototype stops feeling placeholder.
