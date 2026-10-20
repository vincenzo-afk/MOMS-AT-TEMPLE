import { createContext, useContext, useSyncExternalStore } from "react";
import type { Game, UiState } from "../game/core/Game";
import type { GameState } from "../game/core/types";

export const GameContext = createContext<Game | null>(null);

export function useGame(): Game {
  const g = useContext(GameContext);
  if (!g) throw new Error("GameContext missing");
  return g;
}

export function useUi(): UiState {
  const g = useGame();
  return useSyncExternalStore(g.ui.subscribe, g.ui.get);
}

export function useGameState(): GameState {
  const g = useGame();
  return useSyncExternalStore(g.session.subscribe, g.session.getSnapshot);
}
