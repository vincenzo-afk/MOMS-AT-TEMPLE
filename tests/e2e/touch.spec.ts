import { test, expect } from "@playwright/test";
import { findOpenGround, watchConsole } from "./helpers";

test("touch controls: the on-screen stick walks, the Jump button jumps", async ({ page }) => {
  const log = watchConsole(page);
  await page.goto("/?touch");
  await page.getByTestId("title").waitFor({ timeout: 90_000 });
  await page.evaluate(async () => {
    const t = window.__tom!;
    t.game.settings = { ...t.game.settings, showIntro: false };
    await t.saves.deleteSave();
  });
  await page.getByTestId("new-game").click();
  await page.getByTestId("touch-controls").waitFor();
  const [ox, oz] = await findOpenGround(page, 3);
  await page.evaluate(([x, z]) => {
    const g = window.__tom!.game;
    g.player.teleport([x!, 0.5, z!], Math.PI);
    g.cam.yaw = 0;
  }, [ox, oz]);
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => window.__tom!.game.player.position.toArray());
  // drag the stick straight up (forward)
  const box = (await page.getByTestId("touch-stick").boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 60, { steps: 5 });
  await page.waitForTimeout(1200);
  await page.mouse.up();
  const after = await page.evaluate(() => window.__tom!.game.player.position.toArray());
  expect(before[2]! - after[2]!).toBeGreaterThan(1); // walked north (camera yaw 0)
  const jumps0 = await page.evaluate(() => window.__tom!.game.player.stats.jumps);
  await page.getByTestId("touch-jump").dispatchEvent("pointerdown");
  await page.waitForTimeout(80);
  await page.getByTestId("touch-jump").dispatchEvent("pointerup");
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__tom!.game.player.stats.jumps)).toBe(jumps0 + 1);
  await page.screenshot({ path: "test-results/screens/60-touch.png" });
  expect(log.errors).toEqual([]);
});
