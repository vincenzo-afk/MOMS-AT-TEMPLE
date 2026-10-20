import { test, expect, type Page } from "@playwright/test";
import { pressE, startNewGame, talkThrough, teleport, waitForTitle, watchConsole } from "./helpers";

test.describe.configure({ mode: "serial" });

const state = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__tom!.session.state)));
const give = (page: Page, items: Array<[string, number]>) =>
  page.evaluate((items) => {
    const t = window.__tom!;
    for (const [itemId, quantity] of items) {
      const slot = t.session.state.inventory.findIndex((x) => x === null);
      t.session.state.inventory[slot] = { itemId, quantity };
    }
    t.session.advanceTime(1);
  }, items);
/** Stand at (x, z) facing the point (fx, fz). */
const standFacing = async (page: Page, x: number, z: number, fx: number, fz: number) => {
  await teleport(page, x, z, 0);
  await page.evaluate(([fx, fz]) => window.__tom!.game.player.faceTowards({ x: fx, y: 0, z: fz } as never), [fx, fz]);
  await page.waitForTimeout(350);
};
const talkTo = async (page: Page, npcId: string, x: number, z: number) => {
  await page.evaluate(() => {
    window.__tom!.session.state.worldMinutes = Math.floor(window.__tom!.session.state.worldMinutes / 1440) * 1440 + 9 * 60;
    window.__tom!.game.npcs.snapToSchedule();
  });
  const p = await page.evaluate((id) => window.__tom!.game.npcs.positionOf(id).toArray(), npcId);
  await standFacing(page, x, z, p[0]!, p[2]!);
  await expect(page.getByTestId("prompt")).toContainText("Talk to");
  await pressE(page);
  await expect(page.getByTestId("dialogue")).toBeVisible();
  await talkThrough(page);
  await page.waitForTimeout(300);
};

test("the forgotten craft: reopen Kamala's casting corner, read her ledger, cast a brass lamp", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await page.evaluate(() => {
    const t = window.__tom!;
    for (const q of ["q_arrival", "q_channel", "q_chisel", "q_wall"]) t.session.state.quests[q] = { status: "completed", objectiveIndex: 9, counts: {}, startedDay: 1, completedDay: 1 };
  });
  const corner = () =>
    page.evaluate(() => {
      const out: Record<string, boolean> = {};
      window.__tom!.game.level.byId.get("casting_corner")!.traverse((o) => {
        if (o.name === "STATE_neglected" || o.name === "STATE_reopened" || o.name === "FLAME_Forge") out[o.name] = o.visible;
      });
      return out;
    });
  expect(await corner()).toEqual({ STATE_neglected: true, STATE_reopened: false, FLAME_Forge: true });

  // Velan offers the quest
  await talkTo(page, "npc_velan", 27.6, 5.6);
  expect((await state(page)).quests.q_casting?.status).toBe("active");

  // inspect the neglected corner (no station yet: the furnace is cold)
  await standFacing(page, 21.75, 14.9, 21.75, 13.2);
  await expect(page.getByTestId("prompt")).toContainText("Inspect");
  await page.screenshot({ path: "test-results/screens/70-casting-neglected.png" });
  await pressE(page);
  await expect(page.getByTestId("inspect")).toBeVisible();
  await page.keyboard.press("Escape");
  expect((await state(page)).flags.casting_inspected).toBe(true);
  await standFacing(page, 20.3, 14.5, 20.3, 13.2);
  await expect(page.getByTestId("prompt")).not.toContainText("casting furnace");

  // Kamala's ledger can now be read
  await standFacing(page, 19.7, 14.6, 19.7, 13.4);
  await expect(page.getByTestId("prompt")).toContainText("ledger");
  await pressE(page);
  await expect(page.getByTestId("reading")).toContainText("Karthigai");
  await page.keyboard.press("Escape");

  // materials, then the repair
  await give(page, [["timber", 2], ["lime_mortar", 1], ["rope", 1]]);
  await standFacing(page, 21.75, 14.9, 21.75, 13.2);
  await expect(page.getByTestId("prompt")).toContainText("Repair");
  await pressE(page);
  await page.waitForTimeout(3800);
  let s = await state(page);
  expect(s.restorations.rest_casting_corner).toBe("reopened");
  expect(s.flags.casting_reopened).toBe(true);
  expect(await corner()).toEqual({ STATE_neglected: false, STATE_reopened: true, FLAME_Forge: true });
  await page.screenshot({ path: "test-results/screens/71-casting-reopened.png" });

  // broken brass from the ruins and the old grounds (real pickups), wax from the bag
  for (const [x, z] of [[-58.5, -30.2], [-31.2, -38.4]] as Array<[number, number]>) {
    await standFacing(page, x, z + 1.1, x, z);
    await expect(page.getByTestId("prompt")).toContainText("brass");
    await pressE(page);
  }
  await give(page, [["beeswax", 1]]);
  s = await state(page);
  expect(s.pickedUp).toEqual(expect.arrayContaining(["pk_scrap_ruins", "pk_scrap_grounds"]));
  expect(s.quests.q_casting.objectiveIndex).toBe(7); // cast

  // cast at the furnace
  await standFacing(page, 20.3, 14.5, 20.3, 13.2);
  await expect(page.getByTestId("prompt")).toContainText("casting furnace");
  await pressE(page);
  await page.getByTestId("craft-r_brass_lamp").click();
  await page.waitForTimeout(4600);
  s = await state(page);
  expect(s.inventory.some((x: { itemId: string } | null) => x?.itemId === "brass_lamp")).toBe(true);
  if (await page.getByTestId("craft").isVisible()) await page.keyboard.press("Escape");

  // show Velan
  await talkTo(page, "npc_velan", 27.6, 5.6);
  s = await state(page);
  expect(s.quests.q_casting.status).toBe("completed");
  expect(s.flags.casting_revived).toBe(true);
  const ids = s.record.map((e: { id: string }) => e.id);
  expect(ids).toEqual(expect.arrayContaining(["restoration:rest_casting_corner", "discovery:disc_casting_ledger"]));
  expect(log.errors).toEqual([]);
});

test("Karthigai Deepam: a cast lamp for the sanctum door, clay lamps for the walls, the temple lit at dusk", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await page.evaluate(() => {
    const t = window.__tom!;
    for (const q of ["q_arrival", "q_festival", "q_casting"]) t.session.state.quests[q] = { status: "completed", objectiveIndex: 9, counts: {}, startedDay: 1, completedDay: 1 };
    t.session.state.restorations.rest_casting_corner = "reopened";
    t.session.state.flags.casting_reopened = true;
    t.session.state.flags.festival_held = true;
    t.session.advanceTime(1);
  });
  const lamps = () => page.evaluate(() => ["deepam_front_0", "deepam_west_2", "deepam_door_lamp"].map((id) => window.__tom!.game.level.byId.get(id)!.visible));
  expect(await lamps()).toEqual([false, false, false]);

  await talkTo(page, "npc_archaka", 2.4, 0.2);
  expect((await state(page)).quests.q_deepam?.status).toBe("active");
  await talkTo(page, "npc_velan", 27.6, 5.6); // ask about the lamp
  expect((await state(page)).quests.q_deepam.objectiveIndex).toBe(1);

  await give(page, [["brass_scrap", 2], ["beeswax", 1]]);
  await standFacing(page, 20.3, 14.5, 20.3, 13.2);
  await pressE(page);
  await page.getByTestId("craft-r_brass_lamp").click();
  await page.waitForTimeout(4600);
  if (await page.getByTestId("craft").isVisible()) await page.keyboard.press("Escape");
  await give(page, [["oil_lamp", 3]]);
  expect((await state(page)).quests.q_deepam.objectiveIndex).toBe(3);

  await talkTo(page, "npc_archaka", 2.4, 0.2); // the brass lamp
  await talkTo(page, "npc_archaka", 2.4, 0.2); // the clay lamps
  expect((await state(page)).quests.q_deepam.objectiveIndex).toBe(5);
  await talkTo(page, "npc_valli", 3.5, 40.8);
  const s = await state(page);
  expect(s.quests.q_deepam.status).toBe("completed");
  expect(s.flags.deepam_held).toBe(true);
  expect(s.record.map((e: { id: string }) => e.id)).toContain("festival:q_deepam");
  await page.waitForTimeout(300);
  expect(await lamps()).toEqual([true, true, true]);

  // dusk: the walls carry their lamps
  await page.evaluate(() => {
    const t = window.__tom!;
    t.session.state.worldMinutes = Math.floor(t.session.state.worldMinutes / 1440) * 1440 + 19 * 60;
    t.game.player.teleport([0, 0.2, 14], Math.PI);
    t.game.cam.yaw = 0;
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/screens/72-deepam-dusk.png" });
  expect(log.errors).toEqual([]);
});
