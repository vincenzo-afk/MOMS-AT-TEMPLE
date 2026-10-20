import { useEffect, useState } from "react";
import { useGame, useGameState, useUi } from "../hooks";
import { LOCATIONS } from "../../data/text";
import { keyLabel, type Binding } from "../../game/core/Input";
import { VisitHud } from "./Visit";
import { TouchControls, isTouchDevice } from "./TouchControls";

function clock(minutes: number): string {
  const m = Math.floor(minutes % 1440);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function Hud() {
  const game = useGame();
  const ui = useUi();
  const s = useGameState();
  const active = Object.entries(s.quests)
    .filter(([, q]) => q.status === "active")
    .sort((a, b) => b[1].startedDay - a[1].startedDay);
  const tracked = active[0];
  const objective = tracked ? game.session.currentObjective(tracked[0]) : undefined;
  const title = tracked ? game.session.questDef(tracked[0]).title : null;

  return (
    <div className="hud" data-testid="hud">
      <div className="hud-top">
        <div className="hud-place">
          <span className="hud-location" data-testid="location">{ui.locationName}</span>
          <span className="hud-time" data-testid="hud-time">
            Day {Math.floor(s.worldMinutes / 1440) + 1} · {clock(s.worldMinutes)} · {ui.weather === "rain" ? "☂ Rain" : ui.weather === "cloudy" ? "☁ Cloudy" : "☀ Clear"}
            {ui.indoors ? " · indoors" : ""}
          </span>
        </div>
        {!ui.visit && (
          <div className="hud-coins" title="Coins" data-testid="coins">
            <span className="coin" aria-hidden>◎</span> {s.coins}
          </div>
        )}
      </div>

      {title && objective && (
        <div className="objective" data-testid="objective">
          <div className="objective-quest">{title}</div>
          <div className="objective-text">{objective.text}{objective.requiredCount && objective.type === "collect" ? ` (${Math.min(game.session.state.inventory.reduce((n, x) => n + (x?.itemId === objective.targetId ? x.quantity : 0), 0), objective.requiredCount)}/${objective.requiredCount})` : ""}</div>
          <div className="objective-where">{LOCATIONS[objective.locationId]}</div>
        </div>
      )}

      <VisitHud />
      {ui.mode === "play" && ui.panel === null && isTouchDevice() && <TouchControls />}
      <InteractionPrompt prompt={ui.prompt?.primary && ui.panel === null && !ui.busyLabel ? ui.prompt : null} />

      {ui.busyLabel && <div className="busy">{ui.busyLabel}</div>}

      {ui.mode === "play" && !ui.pointerLocked && ui.panel === null && <div className="lock-hint">Click the scene (or hold right mouse) to look around · Esc to pause</div>}
      {s.pendingCrime && <div className="crime-banner" data-testid="crime-banner">Kannan the watchman is looking for you</div>}

      <div className="hud-keys">
        {(
          [
            ["inventory", "Inventory"],
            ["journal", "Journal"],
            ["record", "Living Record"],
            ["map", "Map"],
            ["community", "Community"],
          ] as Array<[Binding, string]>
        ).map(([b, label]) => {
          const k = game.input.keysFor(b)[0]; // follows remapped keys
          return k ? (
            <span key={b}>
              <kbd>{keyLabel(k)}</kbd> {label}
            </span>
          ) : null;
        })}
      </div>

      <div className="toasts" aria-live="polite">
        {ui.toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

type PromptData = NonNullable<ReturnType<typeof useUi>["prompt"]>;

/**
 * Contextual prompt ("E  Sit on the bench") that fades in and out instead of blinking: the last prompt stays
 * mounted for the fade-out. Key labels follow the player's bindings.
 */
function InteractionPrompt({ prompt }: { prompt: PromptData | null }) {
  const game = useGame();
  const [last, setLast] = useState<PromptData | null>(prompt);
  const [leaving, setLeaving] = useState(false);
  if (prompt && prompt !== last) {
    setLast(prompt);
    setLeaving(false);
  } else if (!prompt && last && !leaving) setLeaving(true);
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => setLast(null), 180);
    return () => window.clearTimeout(t);
  }, [leaving]);
  if (!last?.primary) return null;
  const key = (b: "interact" | "secondary") => keyLabel(game.input.keysFor(b)[0] ?? "") || "?";
  return (
    <div className={`prompt ${leaving ? "out" : "in"}`} data-testid={leaving ? undefined : "prompt"}>
      <div className={`prompt-row ${last.primary.enabled ? "" : "disabled"}`}>
        <kbd>{key("interact")}</kbd> {last.primary.label}
      </div>
      {!last.primary.enabled && last.primary.reason && <div className="prompt-reason">{last.primary.reason}</div>}
      {last.secondary && (
        <div className="prompt-row secondary">
          <kbd>{key("secondary")}</kbd> {last.secondary.label}
        </div>
      )}
    </div>
  );
}
