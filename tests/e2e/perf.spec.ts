import { test, expect } from "@playwright/test";
import { startNewGame, waitForTitle, watchConsole } from "./helpers";

// Performance budgets (README §14). Generous on purpose: they catch regressions (a frame-time spike, a leak, a
// draw-call explosion), not the exact numbers of this machine. Measured values are printed for the test plan.
test("budgets: startup, frame-time spikes while running, heap growth, draw calls and triangles", async ({ page }) => {
  test.setTimeout(180_000);
  const log = watchConsole(page);
  const t0 = Date.now();
  await waitForTitle(page);
  const titleMs = Date.now() - t0;
  const t1 = Date.now();
  await startNewGame(page);
  const startMs = Date.now() - t1;

  // run a loop around the courtyard for six seconds, recording every frame's duration
  await page.evaluate(() => window.__tom!.game.player.teleport([0, 0.2, 20], Math.PI));
  await page.waitForTimeout(1000);
  // retained heap: collect garbage first (Chromium with --js-flags=--expose-gc, see playwright.config.ts)
  const heap = () =>
    page.evaluate(async () => {
      const w = window as unknown as { gc?: () => void };
      for (let i = 0; i < 3; i++) {
        w.gc?.();
        await new Promise((r) => setTimeout(r, 50));
      }
      return (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0;
    });
  const heap0 = await heap();
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyW");
  await page.keyboard.down("KeyA");
  const frames = await page.evaluate(
    () =>
      new Promise<number[]>((res) => {
        const out: number[] = [];
        let last = performance.now();
        const end = last + 6000;
        const tick = (now: number) => {
          out.push(now - last);
          last = now;
          if (now < end) requestAnimationFrame(tick);
          else res(out);
        };
        requestAnimationFrame(tick);
      }),
  );
  await page.keyboard.up("KeyA");
  await page.keyboard.up("KeyW");
  await page.keyboard.up("ShiftLeft");
  // ten more seconds of play (time passing, NPCs, weather) for the heap sample
  await page.waitForTimeout(10_000);
  const heap1 = await heap();
  const stats = await page.evaluate(() => ({ ...window.__tom!.game.stats }));

  const sorted = [...frames].sort((a, b) => a - b);
  const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!;
  const r = {
    titleMs,
    startMs,
    frames: frames.length,
    p50: +pct(0.5).toFixed(1),
    p95: +pct(0.95).toFixed(1),
    max: +sorted[sorted.length - 1]!.toFixed(1),
    spikes: frames.filter((f) => f > 100).length,
    heapGrowthMB: +((heap1 - heap0) / 1048576).toFixed(1),
    drawCalls: stats.drawCalls,
    triangles: stats.triangles,
  };
  console.log("BUDGET", JSON.stringify(r));
  expect(titleMs).toBeLessThan(45_000);
  expect(startMs).toBeLessThan(20_000);
  expect(r.p95).toBeLessThan(50); // 20 fps at the 95th percentile, even on software GL
  expect(r.spikes).toBeLessThanOrEqual(3); // hitches over 100 ms
  if (heap0 > 0) expect(r.heapGrowthMB).toBeLessThan(8); // retained after GC: no leak while playing
  expect(r.drawCalls).toBeLessThan(1400);
  expect(r.triangles).toBeLessThan(2_000_000);
  expect(log.errors).toEqual([]);
});
