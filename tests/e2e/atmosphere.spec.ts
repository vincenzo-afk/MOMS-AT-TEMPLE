import { test, expect } from "@playwright/test";
import { startNewGame, waitForTitle, watchConsole } from "./helpers";

test("dry leaves drift down around the player outdoors, settle on the ground, and stay out of interiors", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await page.evaluate(() => {
    const t = window.__tom!;
    t.session.state.worldMinutes = 10 * 60;
    t.game.player.teleport([0, 0.2, 20], Math.PI);
  });
  const a = () => (window.__tom!.game as unknown as { atmosphere: { leafLandings: number; leaves: { visible: boolean } } }).atmosphere;
  const l0 = await page.evaluate(a).then((x) => x.leafLandings);
  await page.waitForTimeout(4000);
  const r = await page.evaluate(a).then((x) => ({ landings: x.leafLandings, visible: x.leaves.visible }));
  expect(r.visible).toBe(true);
  expect(r.landings).toBeGreaterThan(l0);
  await page.screenshot({ path: "test-results/screens/66-leaves.png" });
  // inside the player's house: no leaves
  const inside = await page.evaluate(() => {
    const g = window.__tom!.game;
    const c = g.level.collision;
    // a clear spot under the house roof (a ceiling within 2.5 m over the head)
    for (let x = -29.5; x <= -20.5; x += 0.5)
      for (let z = 24.5; z <= 32.5; z += 0.5) {
        const y = c.groundHeight(x, z, 1.2);
        if (!c.clear(x, z, y, 0.3, 1.7)) continue;
        const head = { x, y: y + 1.7, z } as never;
        if (c.raycast(head, { x: 0, y: 1, z: 0 } as never, 2.5) < 2.5) return [x, y, z];
      }
    return null;
  });
  expect(inside).not.toBeNull();
  await page.evaluate((p) => window.__tom!.game.player.teleport([p![0]!, p![1]! + 0.2, p![2]!], 0), inside);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__tom!.game.ui.get().indoors)).toBe(true);
  expect(await page.evaluate(a).then((x) => x.leaves.visible)).toBe(false);
  expect(log.errors).toEqual([]);
});
