# Audio Bible

Runtime: Web Audio via `src/game/audio/AudioManager.ts`. Three buses: master → music, master → effects (ambience + SFX + UI). The audio context starts on the first user gesture (New Game / Continue). Volume settings apply immediately and persist.

**Status: no audio file has been supplied yet.** Every manifest entry is `pending`. The game makes no network requests for pending files. Interaction and UI cues fall back to short **synthesized sine blips** (code, not files, and clearly placeholders) so feedback and volume controls can be tested. Music and ambience slots stay silent until files arrive.

## Integration steps for a Lyria track

1. Export from Lyria, trim and loop-edit if `loop: true` (zero-crossing start and end, at least a 1 s matching tail).
2. Encode as Ogg Vorbis q5 (music) or q4 (SFX), 44.1 or 48 kHz, stereo for music/ambience, mono for spatial SFX. Normalise music to about −16 LUFS integrated and SFX peaks to −3 dBFS.
3. Save to the `path` in `src/data/audioManifest.ts`, set `durationSec`, change `status` to `"supplied"`, then `"integrated"` once heard in game, and `"verified"` after a review pass.
4. Record the prompt, date and any edits in the table below (generation provenance).

## Manifest and prompts

| ID | Type | Loop | Use | Lyria brief |
|---|---|---|---|---|
| mus_main_theme | music | yes | title and opening approach | Original instrumental main theme for a calm 3D life-simulation set in a fictional South Indian temple settlement. Warm, hopeful, unhurried. Culturally appropriate acoustic timbres (e.g. a plucked string melody, soft hand percussion, a gentle drone) without imitating any named composition or devotional piece. No vocals. 90–120 s with a smooth loop point. |
| mus_exploration_day | music | yes | daytime exploration bed | README §12.4 example prompt (contemplative, curious, quietly hopeful; no vocals; leaves space for ambience; seamless loop). 2–3 min. Lower density than the main theme. |
| mus_restoration | music | no | sting after a restoration | Short (6–10 s) warm resolving phrase, acoustic, satisfying rather than triumphant, no vocals, natural decay ending. |
| mus_discovery | music | no | sting when reading the inscription | Short (5–8 s) mysterious-but-gentle phrase, low drone with a few plucked notes, no vocals. |
| amb_settlement_day | ambience | yes | general daytime bed | Outdoor village morning ambience: birds, light breeze in palm fronds, distant indistinct activity, **no speech, no music, no traffic**. 60–90 s seamless loop. |
| amb_evening | ambience | yes | after 18:00 | Warm evening ambience: crickets, a few evening birds, soft breeze, no speech or music. 60 s loop. |
| amb_channel_water | ambience (spatial) | yes | at the restored channel | README §12.5 water-channel prompt. 30–45 s loop, mono. |
| amb_workshop | ambience (spatial) | yes | at Kamala's workshop | README §12.5 workshop prompt. 30–45 s loop, mono. |
| sfx_footstep_stone / soil | sfx | no | footsteps | Single bare/sandal footstep on dry granite paving / packed earth, 6 variations each, dry, no reverb. |
| sfx_pickup | sfx | no | gathering | Soft tactile pick of a flower sprig / small object, 0.3 s, no music. |
| sfx_craft | sfx | no | craft complete | Short material-handling sound (kneading clay, knotting twine), 0.6–1 s. |
| sfx_restore | sfx | no | restoration complete | README §12.5 restoration feedback prompt. |
| ui_open / ui_confirm | ui | no | panels, quest updates | Very short soft wooden/brass tick, unobtrusive, 0.1–0.2 s. |

Ceremonial or devotional audio (temple bells, nadaswaram, chanting) is **out of scope** until the cultural reference brief is complete. If it is added, it must be researched and used respectfully.

## Mix targets (initial)

Music bus 0.6 of master by default, effects 0.8. Ambience loops sit 6–10 dB under music, and spatial loops use `refDistance` 3–4 m. Stings duck the exploration bed by 6 dB for their length (to implement when real files exist).

## Provenance log

| ID | Date | Tool / version | Prompt reference | Edits | Reviewer |
|---|---|---|---|---|---|
| — | — | — | — | — | — |
