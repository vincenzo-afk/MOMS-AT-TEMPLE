# Audio Bible

Runtime: Web Audio via `src/game/audio/AudioManager.ts`. Three buses: master → music, master → effects (ambience + SFX + UI). The audio context starts on the first user gesture (New Game / Continue). Volume settings apply immediately and persist.

**Status: no audio file has been supplied yet.** Every manifest entry is `pending`. The game makes no network requests for pending files. Interaction and UI cues fall back to short **synthesized sine blips** (code, not files, and clearly placeholders) so feedback and volume controls can be tested. Music cues play a **synthesized placeholder score** until files arrive (see below).

**Procedural soundscape (session 3, placeholder):** `src/game/audio/Soundscape.ts` synthesizes the ambience layers with Web Audio: wind (low-passed noise that follows the weather wind), rain (band-passed noise), water (band-passed noise, louder near the tank and channels), market murmur (band-passed noise near the bazaar by day), birds (chirp bursts by day) and crickets (an amplitude-modulated tone in pulses at night). It also makes surface footsteps (stone, soil, wood) timed to the walk cycle, door creaks and the theft alarm. These are code, not recordings. They are clearly placeholders, and each layer mutes automatically once the matching Lyria file is supplied (`AudioManager.hasFile`). They have not been mixed or listened to on speakers by a person; the automated tests run with audio muted and only check that the cues fire.

**Placeholder score (session 5):** `src/game/audio/MusicSynth.ts` plays each music cue as Web Audio code: a tanpura-style drone (Pa, Sa', Sa', Sa plucks with a harmonic-rich buzz) under sparse flute-like phrases in a scale chosen for the hour (Mohanam by day, Bhupalam at dawn, Kharaharapriya with a soft frame-drum pulse in the workshop, Kalyani in the evening, Shankarabharanam with drum on festival evenings), plus short rising stings for a restoration and a discovery. Cues crossfade (2.5 s) and notes are scheduled ahead on the audio clock. These are placeholders in the same spirit as the soundscape: a supplied track replaces its cue automatically (`AudioManager.setMusic`). They are original note patterns, not any composition, and have not been reviewed by a musician.

**Cue rules** (`src/game/audio/musicCues.ts`, unit tested): 05–09 `mus_morning`; 09–17 `mus_exploration_day`, or `mus_workshop` inside the workshop yard; 17–21 `mus_evening`; festival evenings (17–23, after the lamp festival) `mus_festival`; late night and Temple Visits have no music (ambience, bells and crowd carry the scene). The title screen plays `mus_main_theme`.

**Spatial audio:** manifest entries with `spatial` play through a `PannerNode` (HRTF, inverse distance, `refDistance` from the manifest, max 80 m); the listener follows the camera every frame. Until `amb_workshop` is supplied, the workshop is heard as procedural chisel-and-mallet taps from Velan's bench (25.5, 1, 8) while he works there by day; the supplied loop will be gated the same way.

**Licences:** every manifest entry has a `licence` field (validated non-empty in `validate.ts`). For Lyria output, record the generation terms in force on the generation date and any attribution requirement when changing `status` to `"supplied"`.

## Integration steps for a Lyria track

1. Export from Lyria, trim and loop-edit if `loop: true` (zero-crossing start and end, at least a 1 s matching tail).
2. Encode as Ogg Vorbis q5 (music) or q4 (SFX), 44.1 or 48 kHz, stereo for music/ambience, mono for spatial SFX. Normalise music to about −16 LUFS integrated and SFX peaks to −3 dBFS.
3. Save to the `path` in `src/data/audioManifest.ts`, set `durationSec`, change `status` to `"supplied"`, then `"integrated"` once heard in game, and `"verified"` after a review pass.
4. Record the prompt, date and any edits in the table below (generation provenance), and fill the entry's `licence`.

## Manifest and prompts

| ID | Type | Loop | Use | Lyria brief |
|---|---|---|---|---|
| mus_main_theme | music | yes | title and opening approach | Original instrumental main theme for a calm 3D life-simulation set in a fictional South Indian temple settlement. Warm, hopeful, unhurried. Culturally appropriate acoustic timbres (e.g. a plucked string melody, soft hand percussion, a gentle drone) without imitating any named composition or devotional piece. No vocals. 90–120 s with a smooth loop point. |
| mus_exploration_day | music | yes | daytime exploration bed | README §12.4 example prompt (contemplative, curious, quietly hopeful; no vocals; leaves space for ambience; seamless loop). 2–3 min. Lower density than the main theme. |
| mus_morning | music | yes | dawn, 05:00–09:00 | Original unhurried, bright early-morning instrumental; gentle drone, a slow plucked or wind melody, no vocals, leaves room for birds. 2 min loop. |
| mus_workshop | music | yes | workshop yard by day | Original light working-rhythm instrumental: soft hand percussion pulse, plucked string figures, no vocals, low density so the chisel ambience sits on top. 90 s loop. |
| mus_evening | music | yes | 17:00–21:00 | Original low, soft evening instrumental for lamp-lighting time; warm drone, sparse melody, no vocals. 2 min loop. |
| mus_restoration | music | no | sting after a restoration | Short (6–10 s) warm resolving phrase, acoustic, satisfying rather than triumphant, no vocals, natural decay ending. |
| mus_discovery | music | no | sting when reading the inscription | Short (5–8 s) mysterious-but-gentle phrase, low drone with a few plucked notes, no vocals. |
| amb_settlement_day | ambience | yes | general daytime bed | Outdoor village morning ambience: birds, light breeze in palm fronds, distant indistinct activity, **no speech, no music, no traffic**. 60–90 s seamless loop. |
| amb_evening | ambience | yes | after 18:00 | Warm evening ambience: crickets, a few evening birds, soft breeze, no speech or music. 60 s loop. |
| amb_channel_water | ambience (spatial) | yes | at the restored channel | README §12.5 water-channel prompt. 30–45 s loop, mono. |
| amb_workshop | ambience (spatial) | yes | at Velan's workbench while he works | README §12.5 workshop prompt. 30–45 s loop, mono. |
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
