import { useEffect, useRef, useState } from "react";
import { Game } from "../game/core/Game";
import { GameSession } from "../game/core/GameSession";
import { loadDefinitions } from "../game/core/defs";
import { SaveSystem } from "../game/save/SaveSystem";
import { validateDefinitions } from "../data/validate";
import { GameContext, useUi } from "../ui/hooks";
import { Hud } from "../ui/components/Hud";
import { Panels } from "../ui/components/Panels";
import { ErrorScreen, IntroOverlay, LoadingScreen, PauseMenu, TitleScreen } from "../ui/components/Screens";

declare global {
  interface Window {
    __tom?: { game: Game; session: GameSession; saves: SaveSystem };
  }
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let g: Game | null = null;
    let cancelled = false;
    (async () => {
      try {
        const defs = loadDefinitions();
        const problems = validateDefinitions(defs);
        if (problems.length) throw new Error(`Game data failed validation:\n${problems.join("\n")}`);
        const saves = new SaveSystem(defs);
        const settings = await saves.loadSettings();
        const session = new GameSession(defs);
        if (cancelled || !canvasRef.current) return;
        g = new Game(canvasRef.current, session, saves, settings);
        window.__tom = { game: g, session, saves }; // diagnostics + browser tests
        setGame(g);
        await g.init();
      } catch (e) {
        console.error(e);
        setBootError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
      g?.dispose();
    };
  }, []);

  return (
    <div className="app">
      <canvas
        ref={canvasRef}
        className="scene"
        data-testid="scene"
        onClick={() => {
          const ui = game?.ui.get();
          if (ui?.mode === "play" && ui.panel === null) game?.input.requestLock();
        }}
      />
      {bootError && <ErrorScreen message={bootError} />}
      {game && (
        <GameContext.Provider value={game}>
          <Overlay />
        </GameContext.Provider>
      )}
    </div>
  );
}

function Overlay() {
  const ui = useUi();
  return (
    <>
      {ui.mode === "loading" && <LoadingScreen />}
      {ui.mode === "error" && <ErrorScreen message={ui.error ?? "Unknown error"} />}
      {ui.mode === "title" && <TitleScreen />}
      {ui.mode === "intro" && <IntroOverlay />}
      {(ui.mode === "play" || ui.mode === "paused") && <Hud />}
      {ui.mode === "play" && <Panels />}
      {ui.mode === "paused" && <PauseMenu />}
    </>
  );
}
