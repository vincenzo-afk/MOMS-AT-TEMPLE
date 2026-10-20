import { test, expect } from "@playwright/test";
import { startNewGame, waitForTitle, watchConsole } from "./helpers";

// Stuck recovery (re-plan, skip the waypoint, step past) forced on purpose: Amudha sets off for her midday rest
// and finds herself boxed in by four walls that are not on any route.
test("a villager boxed in on her route re-plans, then steps past and carries on", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await page.evaluate(() => {
    const t = window.__tom!;
    t.session.state.worldMinutes = 11 * 60 + 59.5;
    t.game.npcs.snapToSchedule();
    const a = t.game.npcs.positionOf("npc_amudha");
    t.game.player.teleport([a.x + 4, a.y + 0.3, a.z + 4], 0); // close by, so she is simulated at full detail
  });
  await page.waitForTimeout(600); // she has left her bed and is on the path
  const start = await page.evaluate(() => {
    const g = window.__tom!.game;
    const p = g.npcs.positionOf("npc_amudha");
    const wall = (cx: number, cz: number, hx: number, hz: number) =>
      g.level.collision.add({ cx, cz, hx, hz, cos: 1, sin: 0, yMin: p.y - 0.5, yMax: p.y + 2.5, walk: false, name: "COL_TestCage" } as never);
    const r = 0.75;
    wall(p.x + r, p.z, 0.1, r + 0.1);
    wall(p.x - r, p.z, 0.1, r + 0.1);
    wall(p.x, p.z + r, r + 0.1, 0.1);
    wall(p.x, p.z - r, r + 0.1, 0.1);
    return { pos: p.toArray(), stats: { ...(g.npcs as unknown as { stats: { repaths: number; unstuck: number } }).stats } };
  });
  // three 2 s checks: re-plan, skip, then step past the obstacle
  await page.waitForTimeout(8000);
  const after = await page.evaluate(() => {
    const g = window.__tom!.game;
    const n = (g.npcs as unknown as { npcs: Map<string, { object: { position: { toArray: () => number[] } }; anchorId: string }> }).npcs.get("npc_amudha")!;
    return { pos: n.object.position.toArray(), anchor: n.anchorId, stats: { ...(g.npcs as unknown as { stats: { repaths: number; unstuck: number } }).stats } };
  });
  expect(after.stats.repaths - start.stats.repaths).toBeGreaterThanOrEqual(2);
  expect(after.stats.unstuck - start.stats.unstuck).toBeGreaterThanOrEqual(1);
  expect(Math.hypot(after.pos[0]! - start.pos[0]!, after.pos[2]! - start.pos[2]!)).toBeGreaterThan(0.9); // out of the cage
  expect(after.anchor).toBe("anc_amudha_rest");
  expect(log.errors).toEqual([]);
});
