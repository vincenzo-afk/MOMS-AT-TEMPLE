import { test, expect, type Page } from "@playwright/test";
import { pressE, startNewGame, talkThrough, teleport, waitForTitle, watchConsole } from "./helpers";

test.describe.configure({ mode: "serial" });

const state = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__tom!.session.state)));

test("the archaka: morning puja at the temple door, his lamp quest, the bell at five", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await page.evaluate(() => {
    const t = window.__tom!;
    t.session.state.quests.q_arrival = { status: "completed", objectiveIndex: 2, counts: {}, startedDay: 1, completedDay: 1 };
    t.session.state.worldMinutes = 9 * 60;
    t.game.npcs.snapToSchedule();
  });
  await teleport(page, 2.4, 0.2, Math.PI);
  await expect(page.getByTestId("prompt")).toContainText("Talk to Sundaram");
  await pressE(page);
  await expect(page.getByTestId("dialogue")).toContainText("Sundaram");
  await talkThrough(page);
  expect((await state(page)).quests.q_archaka_lamp?.status).toBe("active");
  // a lamp from the bag (the shop and the skill recipe are covered by unit tests)
  await page.evaluate(() => {
    const t = window.__tom!;
    const slot = t.session.state.inventory.findIndex((x) => x === null);
    t.session.state.inventory[slot] = { itemId: "oil_lamp", quantity: 1 };
    t.session.advanceTime(1);
  });
  await page.waitForTimeout(300);
  await pressE(page);
  await talkThrough(page);
  const s = await state(page);
  expect(s.quests.q_archaka_lamp.status).toBe("completed");
  expect(s.flags.archaka_blessing).toBe(true);
  // the evening puja: the bell rings at five when you are near the temple
  const bells0 = await page.evaluate(() => window.__tom!.game.audio.cueCounts.bell ?? 0);
  await page.evaluate(() => (window.__tom!.session.state.worldMinutes = 16 * 60 + 59.5));
  await page.waitForTimeout(2600);
  expect(await page.evaluate(() => window.__tom!.game.audio.cueCounts.bell ?? 0)).toBeGreaterThanOrEqual(bells0 + 3);
  expect(log.errors).toEqual([]);
});

test("festival build-up stages the decorations; the household shelf stores things; sprinting past people draws a remark", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  const vis = (ids: string[]) => page.evaluate((ids) => ids.map((id) => window.__tom!.game.level.byId.get(id)!.visible), ids);
  expect(await vis(["fest_bunting_1", "fest_kolam_1", "fest_lamps_1"])).toEqual([false, false, false]);
  await page.evaluate(() => {
    window.__tom!.session.state.flags.festival_preparing = true;
    window.__tom!.session.advanceTime(1);
  });
  await page.waitForTimeout(200);
  expect(await vis(["fest_bunting_1", "fest_kolam_1", "fest_lamps_1"])).toEqual([true, false, false]);
  await page.evaluate(() => {
    window.__tom!.session.state.flags.festival_bundle_ready = true;
    window.__tom!.session.advanceTime(1);
  });
  await page.waitForTimeout(200);
  expect(await vis(["fest_bunting_1", "fest_kolam_1", "fest_lamps_1"])).toEqual([true, true, false]);

  // the shelf in your house: a second store
  await page.evaluate(() => {
    const t = window.__tom!;
    t.session.state.inventory[0] = { itemId: "rope", quantity: 1 };
    t.session.advanceTime(1);
  });
  await teleport(page, -29.4, 28.2, Math.PI);
  await expect(page.getByTestId("prompt")).toContainText("shelf");
  await pressE(page);
  await page.getByTestId("container").waitFor();
  await page.locator("[data-testid=container] .inv-grid").nth(1).locator(".slot").first().click();
  const shelf = await page.evaluate(() => window.__tom!.session.state.containers.ct_home_shelf);
  expect(shelf!.some((x: { itemId: string } | null) => x?.itemId === "rope")).toBe(true);
  await page.keyboard.press("Escape");

  // sprinting past Valli across the open courtyard
  await page.evaluate(() => {
    window.__tom!.session.state.worldMinutes = 9 * 60;
    window.__tom!.game.npcs.snapToSchedule();
  });
  const valli = await page.evaluate(() => window.__tom!.game.npcs.positionOf("npc_valli").toArray());
  await page.evaluate(([x, z]) => {
    const g = window.__tom!.game;
    g.player.teleport([x! + 0.8, 0.5, z! - 16], 0); // a run-up long enough to build into a sprint
    g.cam.yaw = Math.PI; // W heads +z, toward her
  }, [valli[0]!, valli[2]!]);
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyW");
  await expect(page.locator(".bubble").filter({ hasText: /Slow down|Running|Steady/ }).first()).toBeVisible({ timeout: 8000 });
  await page.keyboard.up("KeyW");
  await page.keyboard.up("ShiftLeft");
  expect(log.errors).toEqual([]);
});
