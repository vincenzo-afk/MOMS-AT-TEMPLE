import { test, expect } from "@playwright/test";
import { findOpenGround, hold, startNewGame, waitForTitle, watchConsole } from "./helpers";

test.describe.configure({ mode: "serial" });

test("tutorial: steps complete from real input (look, walk, jog, jump), progress is saved, Skip ends it", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  const card = page.getByTestId("tutorial");
  await expect(card).toContainText("Look around");
  const [ox, oz] = await findOpenGround(page, 4);
  await page.evaluate(([x, z]) => window.__tom!.game.player.teleport([x!, 0.5, z!], Math.PI), [ox, oz]);
  // look: turn the camera
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => (window.__tom!.game.cam.yaw += 0.2));
    await page.waitForTimeout(40);
  }
  await expect(card).toContainText("Walk");
  await hold(page, ["KeyW"], 2600);
  await expect(card).toContainText("Jog");
  await hold(page, ["ShiftLeft", "KeyW"], 1400);
  await expect(card).toContainText("Jump");
  await page.keyboard.press("Space");
  await expect(card).toContainText("Talk to Valli");
  const flags = await page.evaluate(() => window.__tom!.session.state.flags);
  expect(flags.tut_look && flags.tut_walk && flags.tut_jog && flags.tut_jump).toBe(true);
  await page.screenshot({ path: "test-results/screens/61-tutorial.png" });
  // the real path mid-play: Esc (pause) -> Skip the tutorial
  await page.evaluate(() => window.__tom!.game.pause());
  await page.getByTestId("pause-skip-tutorial").click();
  await page.getByTestId("resume").click();
  await expect(card).toHaveCount(0);
  expect(log.errors).toEqual([]);
});

test("settings: render scale, reduced motion and high contrast take effect; hiding the tab saves", async ({ page }) => {
  await waitForTitle(page);
  await startNewGame(page);
  const pr0 = await page.evaluate(() => window.__tom!.game.renderer.getPixelRatio());
  await page.evaluate(() => {
    const g = window.__tom!.game;
    g.applySettings({ ...g.settings, renderScale: 0.5, reducedMotion: true, highContrast: true });
  });
  const pr1 = await page.evaluate(() => window.__tom!.game.renderer.getPixelRatio());
  expect(pr1).toBeCloseTo(pr0 * 0.5, 2);
  const shake = await page.evaluate(() => {
    const c = window.__tom!.game.cam;
    c.addShake(0.2);
    return (c as unknown as { shake: number }).shake;
  });
  expect(shake).toBe(0);
  expect(await page.evaluate(() => document.documentElement.classList.contains("high-contrast"))).toBe(true);
  await page.screenshot({ path: "test-results/screens/62-high-contrast.png" });
  // hiding the tab writes the save
  await page.evaluate(async () => {
    await window.__tom!.saves.deleteSave();
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(async () => page.evaluate(async () => (await window.__tom!.saves.load()).status)).toBe("loaded");
});
