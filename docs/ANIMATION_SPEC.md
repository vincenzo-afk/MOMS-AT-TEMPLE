# Animation Specification

Clips are keyed procedurally in `blender/scripts/tom/character.py` (`CLIPS`) at **30 fps**, exported as separate glTF animations in every character GLB (each character's own rest pose, so hip offsets are correct for different heights). All clips are **in place**: no root motion; the engine moves the character and drives locomotion playback from the actual speed.

| Clip | Frames | Duration | Loop | Purpose / action moment |
|---|---|---|---|---|
| idle_relaxed | 120 | 4.0 s | yes | breathing, weight shift, glance |
| walk_forward | 30 | 1.0 s | yes | 27° thigh swing, 1.65 m per cycle |
| run_forward | 20 | 0.667 s | yes | 40° swing, forward lean, 2.6 m per cycle |
| turn_left / turn_right | 24 | 0.8 s | yes | stepping in place while rotating with little speed |
| interact_reach | 30 | 1.0 s | no | right arm reaches forward; peak at 0.45 s |
| pickup_ground | 42 | 1.4 s | no | crouch + reach to ground; peak at 0.6 s |
| talk_idle | 90 | 3.0 s | yes | listening / conversation stance |
| talk_gesture | 60 | 2.0 s | no | open-hand explaining gesture |
| craft_at_station | 60 | 2.0 s | yes | two-handed work at bench height |
| repair_channel | 48 | 1.6 s | yes | kneel and work low (also the gardener's work loop) |

Not yet produced (listed in README §7.1): `idle_look_around`, `walk_start/stop`, `walk_backward`, strafes, `pickup_table`, `place_object`, carry, `inspect_object`, container open/close, `talk_explain/listen`, `greet`, give/receive, `gather_flower`, `water_plant`, `craft_garland`, `read_record`, `sit_idle`, `rest_idle`, and NPC-specific variants.

## Runtime rules (`CharacterAnimator`)

- **Locomotion blend:** idle ↔ walk ↔ run weights from speed. Walk and run share one normalised phase that advances at `speed / strideLength(k)`, where the stride length is interpolated between 1.65 m (walk) and 2.6 m (run) per cycle. The feet therefore travel at the same rate as the body at any speed between the authored ones. Player speeds: walk 2.2 m/s (×1.33 cycle rate), run 5.0 m/s (×1.28).
- The speed fed to the animator is the **post-collision** speed, so walking into a wall does not animate a walk in place.
- **Exclusive actions:** one action at a time. While an action plays, all locomotion weights fade to 0 over 0.22 s; ending it fades locomotion back. Starting a new action fades the previous one out. Movement input is locked during actions.
- **Gameplay is not driven by animation:** `GameSession` validates and applies the state change first (e.g. gather, craft, repair); the clip is presentation only. If the action fails validation, no animation plays.
- Turn clips play only when the facing error is > 0.6 rad and speed < 0.4 m/s.

## Review procedure

`blender -b blender/source/<asset>.blend -P blender/scripts/review_character.py -- clip,clip` renders a front and side strip of four phases per clip to `blender/export_reports/previews/<asset>_<clip>.png`. Then check in game (the e2e test also checks that the walk clip is driven).
