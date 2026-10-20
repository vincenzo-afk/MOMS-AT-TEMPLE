import { test, expect } from "@playwright/test";
import { pressE, startNewGame, teleport, waitForTitle, watchConsole } from "./helpers";

test.describe.configure({ mode: "serial" });

const give = (page: import("@playwright/test").Page, itemId: string, quantity: number) =>
  page.evaluate(
    ([itemId, quantity]) => {
      const t = window.__tom!;
      const inv = t.session.state.inventory;
      const i = inv.findIndex((x) => x === null);
      inv[i] = { itemId: itemId as string, quantity: quantity as number };
      t.session.advanceTime(1);
    },
    [itemId, quantity] as const,
  );

test("notice board, storage chest, home decoration, map and community panels", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);

  // notice board by the south gate lists open requests
  await teleport(page, 4.4, 52, Math.PI / 2);
  await expect(page.getByTestId("prompt")).toContainText("notice board");
  await pressE(page);
  await expect(page.getByTestId("notices")).toContainText("A Welcome of Jasmine");
  await page.keyboard.press("Escape");

  // storage chest at the player's house
  await give(page, "timber", 3);
  await teleport(page, -20.4, 30.3, -Math.PI / 2);
  await expect(page.getByTestId("prompt")).toContainText("storage chest");
  await pressE(page);
  await expect(page.getByTestId("storage")).toBeVisible();
  await page.getByTestId("bag-timber").click();
  await expect(page.getByTestId("chest-timber")).toBeVisible();
  await page.screenshot({ path: "test-results/screens/60-storage.png" });
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.__tom!.session.state.storage.some((x) => x?.itemId === "timber"))).toBe(true);

  // decorate: place a lamp, the lamp appears on the veranda
  await give(page, "oil_lamp", 1);
  await teleport(page, -19.6, 28, -Math.PI / 2);
  await expect(page.getByTestId("prompt")).toContainText("Decorate");
  await pressE(page);
  await page.getByTestId("place-decor_lamp").click();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.__tom!.game.level.byId.get("decor_lamp")!.visible)).toBe(true);

  // map and community open from the keyboard
  await page.keyboard.press("KeyM");
  await expect(page.getByTestId("map")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await page.keyboard.press("KeyK");
  await expect(page.getByTestId("person-npc_valli")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(log.errors).toEqual([]);
});

test("farming through the world: plant, water from the tank, grow, harvest", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await give(page, "seed_packet", 1);
  await give(page, "water_vessel", 1);
  await teleport(page, 34, -63.0, Math.PI);
  await expect(page.getByTestId("prompt")).toContainText("Plant");
  await pressE(page);
  await page.waitForTimeout(2200);
  expect(await page.evaluate(() => window.__tom!.session.plotState("plot_1").stage)).toBe("planted");
  await expect(page.getByTestId("prompt")).toContainText("Fill a water pot first");

  await teleport(page, 36.4, -23.0, Math.PI);
  await expect(page.getByTestId("prompt")).toContainText("Fill water pot");
  await pressE(page);
  await page.waitForTimeout(1600);

  await teleport(page, 34, -63.0, Math.PI);
  await expect(page.getByTestId("prompt")).toContainText("Water");
  await pressE(page);
  await page.waitForTimeout(2600);
  expect(await page.evaluate(() => window.__tom!.session.plotState("plot_1").stage)).toBe("growing");
  const visibleStage = () =>
    page.evaluate(() => {
      let v = "";
      window.__tom!.game.level.byId.get("plot_1")!.traverse((o) => {
        if (o.name.startsWith("STATE_") && o.visible) v = o.name;
      });
      return v;
    });
  expect(await visibleStage()).toBe("STATE_growing");
  await page.evaluate(() => window.__tom!.session.advanceTime(181));
  expect(await visibleStage()).toBe("STATE_ripe");
  await expect(page.getByTestId("prompt")).toContainText("Harvest");
  await pressE(page);
  await page.waitForTimeout(2000);
  expect(await page.evaluate(() => window.__tom!.session.state.inventory.find((x) => x?.itemId === "produce")?.quantity)).toBe(2);
  await page.screenshot({ path: "test-results/screens/61-harvest.png" });
  expect(log.errors).toEqual([]);
});

test("restoration with state-dependent collision: clearing the overgrown path opens the way", async ({ page }) => {
  await waitForTitle(page);
  await startNewGame(page);
  const blocked = () => page.evaluate(() => window.__tom!.game.level.stateColliders.find((c) => c.placementId === "old_path")!.box.enabled);
  expect(await blocked()).toBe(true);
  await give(page, "sickle", 1);
  await teleport(page, -79.6, -22, -Math.PI / 2);
  await expect(page.getByTestId("prompt")).toContainText("Clear the overgrown path");
  await pressE(page);
  await page.waitForTimeout(3300);
  expect(await page.evaluate(() => window.__tom!.session.state.restorations.rest_old_path)).toBe("cleared");
  expect(await blocked()).toBe(false);
  // walk through the cleared path toward the pavilion
  await page.evaluate(() => (window.__tom!.game.cam.yaw = Math.PI / 2));
  const x0 = await page.evaluate(() => window.__tom!.game.player.position.x);
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(2000);
  await page.keyboard.up("KeyW");
  const x1 = await page.evaluate(() => window.__tom!.game.player.position.x);
  expect(x0 - x1).toBeGreaterThan(3);
});
