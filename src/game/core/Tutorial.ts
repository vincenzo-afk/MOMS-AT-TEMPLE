/**
 * First-minutes onboarding (README §3.1): teach the camera, walking, jogging, jumping, talking, collecting, the
 * inventory, inspecting a problem and the Living Record - each step completes from what the player actually
 * does, never from a timer. Progress lives in save flags (tut_<id>), so a loaded game does not repeat it.
 */

export interface TutorialStep {
  id: string;
  text: string;
  keys: string;
}

export const TUTORIAL: TutorialStep[] = [
  { id: "look", text: "Look around", keys: "Move the mouse (click the scene first) or hold the right button" },
  { id: "walk", text: "Walk toward the gate", keys: "W A S D" },
  { id: "jog", text: "Jog - keep holding to sprint", keys: "Shift + W" },
  { id: "jump", text: "Jump (near a low wall it vaults)", keys: "Space" },
  { id: "talk", text: "Talk to Valli just inside the gate", keys: "E" },
  { id: "gather", text: "Collect jasmine on the west street", keys: "E" },
  { id: "inventory", text: "Open your inventory", keys: "I" },
  { id: "inspect", text: "Inspect a problem in the settlement", keys: "R or E on a damaged place" },
  { id: "record", text: "Open the Living Record to see what changed", keys: "L" },
];

/** What the game reports each frame; the tutorial decides whether the current step is done. */
export interface TutorialSignals {
  cameraTurned: number; // accumulated |yaw change| (radians)
  walked: number; // metres moved on foot
  jogSeconds: number;
  jumps: number;
  talkedToValli: boolean;
  gathered: boolean;
  panelsOpened: Set<string>;
  inspected: boolean;
}

export function stepDone(id: string, s: TutorialSignals): boolean {
  switch (id) {
    case "look":
      return s.cameraTurned > 1.2;
    case "walk":
      return s.walked > 4;
    case "jog":
      return s.jogSeconds > 0.8;
    case "jump":
      return s.jumps > 0;
    case "talk":
      return s.talkedToValli;
    case "gather":
      return s.gathered;
    case "inventory":
      return s.panelsOpened.has("inventory");
    case "inspect":
      return s.inspected;
    case "record":
      return s.panelsOpened.has("record");
    default:
      return true;
  }
}

/** The first step not yet completed (by save flags), or null when the tutorial is finished. */
export function currentStep(flags: Record<string, boolean>): TutorialStep | null {
  return TUTORIAL.find((t) => !flags[`tut_${t.id}`]) ?? null;
}
