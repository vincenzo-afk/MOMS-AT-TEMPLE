import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./ui/styles/game.css";

createRoot(document.getElementById("root")!).render(<App />);

// Installable and playable offline once loaded (production builds only: the dev server and tests run without it).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
