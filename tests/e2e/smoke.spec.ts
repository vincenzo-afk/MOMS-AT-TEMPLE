import { test, expect } from "@playwright/test";
import { hold, pressE, startNewGame, teleport, waitForTitle, watchConsole } from "./helpers";

// Cross-browser smoke test (run in Firefox and WebKit with XBROWSER=1, see playwright.config.ts): the game boots,
// renders with WebGL, moves, interacts, opens panels, saves, and logs no errors.
test("smoke: boot, render, move, talk, inventory, save", async ({ page }) => {
  test.setTimeout(240_000);
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  const gl = await page.evaluate(() => {
    const g = window.__tom!.game;
    return { calls: g.stats.drawCalls, tris: g.stats.triangles };
  });
  expect(gl.calls).toBeGreaterThan(20);
  const p0 = await page.evaluate(() => window.__tom!.game.player.position.toArray());
  await hold(page, ["KeyW"], 900);
  const p1 = await page.evaluate(() => window.__tom!.game.player.position.toArray());
  expect(Math.hypot(p1[0]! - p0[0]!, p1[2]! - p0[2]!)).toBeGreaterThan(0.8);
  // Valli at the gate
  await page.evaluate(() => {
    window.__tom!.session.state.worldMinutes = 9 * 60;
    window.__tom!.game.npcs.snapToSchedule();
  });
  await teleport(page, 3.5, 40.8, Math.PI);
  await expect(page.getByTestId("prompt")).toContainText("Talk to Valli");
  await pressE(page);
  await expect(page.getByTestId("dialogue")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyI");
  await expect(page.getByTestId("inventory")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.__tom!.game.pause());
  await page.getByTestId("save").click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.screenshot({ path: `test-results/screens/90-smoke-${test.info().project.name}.png` });
  expect(log.errors).toEqual([]);
});
