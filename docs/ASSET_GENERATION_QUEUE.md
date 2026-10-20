# Asset Generation Queue (image references)

> **Session 2:** 14 reference sheets were supplied in `asserts_img/` and the matching assets were built (see `docs/REFERENCE_COVERAGE.md`). The requests below stay open where those sheets do not cover them: close **orthographic turnarounds** of each character (front, side and back at the same scale), a **temple elevation** sheet, and **painted inventory icons** in the COLECTABLES.jpg style (session 5: rendered icons for all 32 items stand in until painted ones exist; see `blender/scripts/render_icons.py`).

These images are **references for the Blender production pass**, not game assets. The first playable area already exists as procedural Blender models; the references below are what is needed to raise the most visible assets from first-pass to production quality. Generate a small coherent set first (priority 1), review it against the acceptance rules in README §10.5, and drop approved files into `blender/references/<ASSET_ID>/`.

**Shared style line (append to every prompt):**
> Stylized 3D game concept art, clean painterly shading, soft late-morning light, warm granite and lime plaster, terracotta, teak, saffron and indigo cloth accents, readable silhouettes, no text, no watermark, no logos, neutral background unless stated.

**Shared rules:** orthographic-like views for turnarounds; the same description for every view of one asset; no deities, no religious iconography inside shrines, no real-world named temple. Cultural details to be checked against the reference brief (not yet written; see DECISIONS).

---

## Priority 1: first playable area

### REF_CHR_Player_Base: player turnaround
- **Use:** model reference for the production player mesh (replaces the procedural first pass; same rig SK_Humanoid_A).
- **Subject:** a young adult newcomer to a South Indian village, friendly and practical. Knee-length white cotton veshti tucked up for work, with a narrow red border; short-sleeved cream cotton tunic; saffron shoulder cloth worn across the left shoulder; simple leather sandals; short black hair, light moustache.
- **Views:** front, left side, back, three-quarter front. Full body, A-pose, arms 10–15° from the body, feet shoulder-width. Plus a head close-up sheet: front, profile, 3/4.
- **Scale:** 1.74 m, head ≈ 1/7.2 of height (slightly stylized, larger head).
- **Materials/colour:** palette in ART_BIBLE (cloth_white, plaster_warm tunic, cloth_saffron, cloth_red border).
- **Variants:** none yet.
- **Type:** model reference.
- **Blender requirements:** quad-based body that keeps the current joint heights (CHARACTER_BIBLE proportion table) so existing clips still fit; separate veshti shell; hands with four fingers + thumb.

### REF_CHR_NPC_Set: five NPC turnarounds (one sheet each)
- **Use:** production references for Valli (resident, red saree, yellow border, jasmine in a bun), Murugan (gardener, green veshti at knee, white head towel), Kamala (artisan, indigo saree with saffron border), Selvam (trader, sand kurta, saffron turban, rounder build), Elder Ponnan (bald with white fringe and beard, white veshti and shawl).
- **Views:** front, side, back, 3/4. Same A-pose and lighting as REF_CHR_Player_Base. **Generate after the player sheet is approved and reuse its exact style line.**
- **Scale:** heights per CHARACTER_BIBLE.
- **Type:** model reference. **Priority 1** for Valli and Murugan, 2 for the rest.

### REF_ENV_Temple_Main_A: central shrine
- **Use:** improve the landmark `ENV_Temple_Main_A` (ornament, proportions of the vimana, porch pillars).
- **Subject:** a small granite shrine on a moulded plinth (rounded torus moulding), square sanctum with pilastered walls and empty wall niches, closed teak doors with brass studs, a pillared front porch with Dravidian-style square-octagonal pillars and bracket capitals, and a three-tier pyramidal tower of lime-plastered miniature pavilions topped by an octagonal dome and brass finial.
- **Views:** front elevation, side elevation, 3/4 view, plus a detail sheet (plinth moulding profile, pillar, bracket capital, one miniature pavilion).
- **Scale:** plinth 11 × 15 m, 1.2 m high; total height ≈ 13 m; a 1.75 m figure for scale in the 3/4 view.
- **Materials:** grey-brown granite lower storey, warm lime-plaster tower with ochre recesses, brass finials. No painted figures.
- **Type:** model reference. Must match existing footprint and step position (front faces +Z in game).

### REF_ENV_Gopuram_Entrance_A: gateway tower
- **Use:** silhouette and ornament for `ENV_Gopuram_Entrance_A`.
- **Subject:** a modest gateway tower in a village compound wall: granite base with a tall passage and open teak doors, three diminishing plastered tiers with pilasters and small windows, a barrel-vaulted crown with five brass finials. Plain plaster, no sculpted figures.
- **Views:** front elevation, side, 3/4 with figure for scale. **Scale:** 9.2 m wide, 5 m deep, ≈ 12.5 m tall, passage 2.8 m wide.
- **Type:** model reference.

### REF_ENV_Channel_States: irrigation channel before and after
- **Use:** improve `PRP_Channel_Blocked_A` / `PRP_Channel_Restored_A`; this is the game's key "visible change" moment.
- **Subject (same camera for both):** a narrow stone-lined irrigation channel (0.6 m wide, 0.4 m walls) along the edge of a flower garden. A: a collapsed section, fallen blocks, silt mound with weeds, dry cracked bed downstream, water pooled upstream. B: the same section rebuilt with slightly lighter new granite and fresh lime mortar joints, clear water flowing and spilling into the garden.
- **Views:** 3/4 from the garden side, eye height 1.6 m; plus top-down plan of the broken section.
- **Type:** model and environment reference.

### REF_ENV_Garden_States: marigold beds withered and blooming
- **Use:** `PRP_Marigold_Bed_A` STATE_withered / STATE_recovering.
- **Subject (same camera):** raised soil beds with brick edging; A: dry, brown, drooping stalks; B: lush green plants with orange and yellow marigold heads.
- **Views:** 3/4 at eye height. **Type:** environment reference.

## Priority 2

| ID | Use | Subject and views | Type |
|---|---|---|---|
| REF_ENV_House_Village | `ENV_House_Village_A/B` production pass | Tamil village house with raised thinnai veranda, teak posts, clay-tile gable roof, lime-washed walls with red-oxide base band, carved teak door; front, side, 3/4, door detail | model ref |
| REF_ENV_Workshop | `ENV_Workshop_A` | open-fronted artisan shed with lean-to tile roof, teak workbench, shelves of clay pots, lime trough, potter's wheel; 3/4 front and interior view | model ref |
| REF_ENV_Market_Stall | `ENV_Market_Stall_A` | small trader's stall with striped cloth canopy, counter with baskets of flowers, twine rolls, brass pots, sacks; front, 3/4 | model ref |
| REF_ENV_Old_Grounds | old grounds dressing | overgrown remains of a small pillared pavilion, broken pillars, collapsed granite walls, an upright inscribed stone; wide establishing shot + detail of the inscription stone | environment ref |
| REF_ENV_Courtyard_Mood | lighting and atmosphere target | the courtyard at golden hour from player height: lamp pillar, tree platform, striped compound wall, temple tower behind | mood / lighting ref |

## Priority 3: UI and icons

| ID | Use | Notes | Type |
|---|---|---|---|
| UI_Icon_Set_A | inventory icons for the 7 current items (jasmine, marigold, dressed stone, lime clay, lime mortar, banana twine, garland) | 256 px, single object on transparent background, consistent top-left light, painterly | icon |
| UI_Frame_Reference | panel frame / divider ornament for HUD and journal | subtle brass and teak motifs, must remain legible at small sizes; no religious symbols | UI ref |

## Textures (only if needed after the production modelling pass)

Prefer vertex colour plus geometry. Tileable 512 px textures can be considered for **granite** and **lime plaster** only. Prompt for flat, evenly lit, seamless, no baked shadows; then build roughness from the same source. Not requested yet.
