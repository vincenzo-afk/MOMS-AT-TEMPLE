import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { useGame } from "../hooks";
import type { Binding } from "../../game/core/Input";

/** True on touch-first devices (or when forced with ?touch for testing). */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("touch") || window.matchMedia?.("(pointer: coarse)").matches === true;
}

const RADIUS = 56; // px of stick travel

/**
 * On-screen controls for touch devices (GAME_DESIGN.md §1: "on-screen d-pad on touch"): a left analog stick,
 * a right-side look area, and buttons for interact, jump, run and crouch. Pointer events feed the same Input
 * channels as keyboard and gamepad, so every system works unchanged.
 */
export function TouchControls() {
  const game = useGame();
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const stick = useRef<{ id: number; cx: number; cy: number } | null>(null);
  const look = useRef<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => {
    game.input.setTouchMode(true);
  }, [game]);

  const stickDown = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    stick.current = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    e.currentTarget.setPointerCapture(e.pointerId);
    stickMove(e);
  };
  const stickMove = (e: RPointerEvent<HTMLDivElement>) => {
    const s = stick.current;
    if (!s || s.id !== e.pointerId) return;
    let dx = e.clientX - s.cx;
    let dy = e.clientY - s.cy;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS;
      dy = (dy / d) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    game.input.setTouchAxis(dx / RADIUS, dy / RADIUS);
  };
  const stickUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (stick.current?.id !== e.pointerId) return;
    stick.current = null;
    setKnob({ x: 0, y: 0 });
    game.input.setTouchAxis(0, 0);
  };
  const lookDown = (e: RPointerEvent<HTMLDivElement>) => {
    look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const lookMove = (e: RPointerEvent<HTMLDivElement>) => {
    const l = look.current;
    if (!l || l.id !== e.pointerId) return;
    game.input.touchLook(e.clientX - l.x, e.clientY - l.y);
    l.x = e.clientX;
    l.y = e.clientY;
  };
  const lookUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (look.current?.id === e.pointerId) look.current = null;
  };
  const button = (b: Binding, label: string) => (
    <button
      className="touch-btn"
      data-testid={`touch-${b}`}
      onPointerDown={(e) => {
        e.preventDefault();
        game.input.touchButton(b, true);
      }}
      onPointerUp={() => game.input.touchButton(b, false)}
      onPointerCancel={() => game.input.touchButton(b, false)}
      onPointerLeave={() => game.input.touchButton(b, false)}
    >
      {label}
    </button>
  );

  return (
    <div className="touch-controls" data-testid="touch-controls">
      <div className="touch-look" onPointerDown={lookDown} onPointerMove={lookMove} onPointerUp={lookUp} onPointerCancel={lookUp} />
      <div className="touch-stick" data-testid="touch-stick" onPointerDown={stickDown} onPointerMove={stickMove} onPointerUp={stickUp} onPointerCancel={stickUp}>
        <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      <div className="touch-buttons">
        {button("interact", "E")}
        {button("jump", "Jump")}
        {button("run", "Run")}
        {button("crouch", "Crouch")}
      </div>
    </div>
  );
}
