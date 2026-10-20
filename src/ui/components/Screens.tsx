import { useEffect, useState } from "react";
import { useGame, useUi } from "../hooks";
import { CONTROLS_HELP } from "../../game/core/Input";
import type { Settings } from "../../game/core/types";

export function LoadingScreen() {
  const ui = useUi();
  const pct = Math.round((ui.loading.done / Math.max(1, ui.loading.total)) * 100);
  return (
    <div className="screen loading" data-testid="loading">
      <h1 className="title">Temple of Monks</h1>
      <div className="bar">
        <div style={{ width: `${pct}%` }} />
      </div>
      <p className="muted">
        {ui.loading.label} {ui.loading.total > 1 ? `(${ui.loading.done}/${ui.loading.total})` : ""}
      </p>
    </div>
  );
}

export function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="screen error" role="alert" data-testid="error">
      <h1 className="title">Something went wrong</h1>
      <pre>{message}</pre>
      <button className="primary" onClick={() => location.reload()}>
        Reload
      </button>
    </div>
  );
}

export function TitleScreen() {
  const game = useGame();
  const ui = useUi();
  const [view, setView] = useState<"menu" | "settings" | "credits" | "controls">("menu");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  return (
    <div className="screen title-screen" data-testid="title">
      <div className="title-card">
        <h1 className="title">Temple of Monks</h1>
        <p className="subtitle">A life in a temple settlement</p>
        {view === "menu" && (
          <nav className="menu">
            {ui.hasSave && (
              <button
                className="primary"
                data-testid="continue"
                onClick={async () => {
                  const err = await game.continueGame();
                  if (err) setMsg(err);
                }}
              >
                Continue
              </button>
            )}
            <button
              className={ui.hasSave ? "" : "primary"}
              data-testid="new-game"
              onClick={() => {
                if (ui.hasSave && !confirmNew) {
                  setConfirmNew(true);
                  return;
                }
                void game.newGame();
              }}
            >
              {confirmNew ? "Start over? Your current save will be replaced on the next save" : "New Game"}
            </button>
            <button onClick={() => setView("controls")}>Controls</button>
            <button onClick={() => setView("settings")}>Settings</button>
            <button onClick={() => setView("credits")}>Credits</button>
            {msg && <p className="muted">{msg}</p>}
            {ui.assetProblems.length > 0 && <p className="warn">Some assets failed to load: {ui.assetProblems.join("; ")}</p>}
            <p className="muted small">To quit, close the browser tab. Progress is saved in this browser.</p>
          </nav>
        )}
        {view === "settings" && <SettingsForm onBack={() => setView("menu")} />}
        {view === "controls" && <Controls onBack={() => setView("menu")} />}
        {view === "credits" && (
          <div className="credits">
            <p>Design, code and procedural 3D assets generated with Claude Code and Blender {`5.2`} scripts in this repository.</p>
            <p>Music and ambience: to be produced with Gemini Lyria (not yet supplied).</p>
            <p>Engine: Three.js, React, Vite.</p>
            <button onClick={() => setView("menu")}>Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Controls({ onBack }: { onBack: () => void }) {
  return (
    <div className="controls">
      <table>
        <tbody>
          {CONTROLS_HELP.map(([k, v]) => (
            <tr key={k}>
              <td>
                <kbd>{k}</kbd>
              </td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={onBack}>Back</button>
    </div>
  );
}

export function IntroOverlay() {
  const game = useGame();
  const ui = useUi();
  return (
    <div className="intro" data-testid="intro">
      <p className="caption">{ui.caption}</p>
      <button className="skip" data-testid="skip-intro" onClick={() => game.skipIntro()}>
        Skip <kbd>E</kbd>
      </button>
    </div>
  );
}

export function PauseMenu() {
  const game = useGame();
  const [view, setView] = useState<"menu" | "settings" | "controls">("menu");
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" && view === "menu") game.resume();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, view]);
  return (
    <div className="screen pause" data-testid="pause">
      <div className="title-card">
        <h2>Paused</h2>
        {view === "menu" && (
          <nav className="menu">
            <button className="primary" data-testid="resume" onClick={() => game.resume()}>
              Resume
            </button>
            <button
              data-testid="save"
              onClick={async () => {
                const ok = await game.saveGame(true);
                setSaved(ok ? "Saved." : "Save failed.");
              }}
            >
              Save game
            </button>
            <button onClick={() => setView("controls")}>Controls</button>
            <button onClick={() => setView("settings")}>Settings</button>
            <button
              onClick={async () => {
                await game.saveGame();
                game.enterTitle();
              }}
            >
              Save and exit to title
            </button>
            {saved && <p className="muted">{saved}</p>}
          </nav>
        )}
        {view === "settings" && <SettingsForm onBack={() => setView("menu")} />}
        {view === "controls" && <Controls onBack={() => setView("menu")} />}
      </div>
    </div>
  );
}

export function SettingsForm({ onBack }: { onBack: () => void }) {
  const game = useGame();
  const [s, setS] = useState<Settings>(game.settings);
  const update = (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    game.applySettings(next);
    void game.saves.saveSettings(next);
  };
  const slider = (key: keyof Settings, label: string, min: number, max: number, step: number) => (
    <label className="setting">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={s[key] as number} onChange={(e) => update({ [key]: Number(e.target.value) } as Partial<Settings>)} data-testid={`setting-${key}`} />
      <output>{key.toLowerCase().includes("volume") ? `${Math.round((s[key] as number) * 100)}%` : (s[key] as number).toFixed(2)}</output>
    </label>
  );
  return (
    <div className="settings" data-testid="settings">
      {slider("masterVolume", "Master volume", 0, 1, 0.05)}
      {slider("musicVolume", "Music volume", 0, 1, 0.05)}
      {slider("effectsVolume", "Effects volume", 0, 1, 0.05)}
      {slider("mouseSensitivity", "Camera sensitivity", 0.2, 3, 0.1)}
      {slider("fov", "Field of view", 45, 75, 1)}
      {slider("textScale", "Text size", 0.85, 1.4, 0.05)}
      <label className="setting">
        <span>Invert camera Y</span>
        <input type="checkbox" checked={s.invertY} onChange={(e) => update({ invertY: e.target.checked })} />
      </label>
      <label className="setting">
        <span>Graphics quality</span>
        <select value={s.graphicsQuality} onChange={(e) => update({ graphicsQuality: e.target.value as Settings["graphicsQuality"] })}>
          <option value="low">Low (no shadows)</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <label className="setting">
        <span>Play opening sequence</span>
        <input type="checkbox" checked={s.showIntro} onChange={(e) => update({ showIntro: e.target.checked })} />
      </label>
      <p className="muted small">Audio: music and ambience tracks are not yet supplied; volume applies to interface sounds now and to music once added.</p>
      <button onClick={onBack}>Back</button>
    </div>
  );
}
