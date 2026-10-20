# Art Bible

## Direction

Stylized, painterly-clean low-to-mid poly. Detail comes from **silhouette and architectural rhythm** (mouldings, pilasters, tiers of miniature shrines, tile rows) rather than textures. Colour is carried by vertex colours with small per-piece variation, so a wall reads as individual blocks and a roof as individual tiles without texture memory cost. Lighting does the rest.

The setting is a fictional temple-centred settlement inspired by South Indian (Tamil) village and temple architecture. The forms used so far (moulded plinth with kumuda torus, pilastered walls with niches, kapota cornices, a stepped vimana with kuta/shala parapets, a gopuram-style gateway with a barrel-vault crown, a deepa-stambha lamp pillar, red-and-white striped compound walls, thinnai verandas, clay-tile roofs) are generic period vocabulary, not a reconstruction of any specific temple. **A cultural and historical reference brief still has to be written** (see README §4.1 and `docs/DECISIONS_AND_KNOWN_ISSUES.md`). No deity, shrine interior or ritual is depicted; temple doors are closed.

## Units and coordinates

| | Blender | Three.js / glTF |
|---|---|---|
| Unit | 1 unit = 1 m | 1 unit = 1 m |
| Up | +Z | +Y |
| Asset front | -Y | +Z |
| Character left | +X | +X |

- Origins sit on the ground at the footprint centre (buildings, props, characters) or at the base centre (pillars, posts).
- Modules (walls) are 4.0 m long and centred; wall posts (1.0 m square) cover joints.
- Character height 1.60–1.76 m. Doorways 2.1–2.6 m. Veranda (thinnai) top 0.85 m above ground. Temple plinth 1.2 m with 0.2 m steps.

## Palette (sRGB, `blender/scripts/tom/core.py: PALETTE`)

| Group | Swatches |
|---|---|
| Stone | granite `#8F8070`, granite_dark `#6B6157`, granite_new `#A89985`, sandstone `#B8946B` |
| Plaster & paint | plaster `#E6DBC2`, plaster_warm `#E0C294`, ochre `#B3572E`, red_oxide `#8C3321` |
| Wood & clay | teak `#6B4226`, teak_dark `#472B1A`, terracotta `#A85433`, tile `#994529` |
| Plants | leaf `#386B29`, leaf_light `#5C8C33`, leaf_dry `#8C7A3D`, moss `#4D6129`, palm `#4D7A2E` |
| Flowers | jasmine `#F7F5E6`, marigold `#FA850F`, marigold_yellow `#FAC21A` |
| Cloth | white `#EBE6D6`, red `#9E291F`, saffron `#DB8024`, indigo `#2E3D6B`, green `#3D6642` |
| Metal | brass `#CC9940` |

## Materials (`MATERIAL_DEFS`)

All library materials read base colour from the `Col` vertex-colour attribute (exported as glTF `COLOR_0`, linear).

| Material | Roughness | Metallic | Use |
|---|---|---|---|
| MAT_Stone_Granite_A | 0.88 | 0 | masonry, paving, pillars |
| MAT_Plaster_Lime_A | 0.92 | 0 | lime-washed walls, stucco tiers |
| MAT_Wood_Teak_A | 0.72 | 0 | doors, posts, benches |
| MAT_Terracotta_A | 0.80 | 0 | roof tiles, pots, brick edging |
| MAT_Thatch_A | 0.95 | 0 | baskets, twine |
| MAT_Foliage_A | 0.78 | 0 | leaves, flowers (double-sided at runtime) |
| MAT_Soil_A | 0.97 | 0 | earth, silt, clay |
| MAT_Cloth_A | 0.95 | 0 | clothing, canopy (double-sided at runtime) |
| MAT_Brass_A | 0.38 | 0.9 | finials, studs, vessels, jewellery |
| MAT_Water_A | — | — | replaced at runtime by the water shader |
| MAT_Skin_A / MAT_Hair_A / MAT_Eye_A | 0.62 / 0.55 / 0.25 | 0 | characters |

## Naming

`ENV_` modular architecture and landmarks · `PRP_` props and vegetation · `CHR_` characters · `MAT_` materials · `SK_` skeletons · `COL_` / `WALK_` collision proxies · `STATE_<state>` state variants · `PICK_` gatherable visuals · `WATER_` water surfaces · `SOCKET_` attachment / interaction empties.

## Blender scene organisation

Each asset `.blend` (in `blender/source/`) has collections `Geometry`, `Collision`, `Rig`, `Reference`, `Export`. The export root is an empty named after the asset in `Export`; everything parented under it is exported, nothing else (no cameras or lights).

## Budgets (first pass, to be revised after profiling on target hardware)

| Type | Triangles | GLB size |
|---|---|---|
| Landmark | ≤ 40k | ≤ 1.5 MB |
| Building | ≤ 12k | ≤ 800 kB |
| Prop / module | ≤ 12k (most < 2k) | ≤ 800 kB |
| Character | ≤ 12k (current ≈ 2–2.6k) | ≤ 800 kB incl. 11 clips |

Current numbers per asset are in `docs/ASSET_MANIFEST.md`.
