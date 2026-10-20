import { test, expect, type Page } from "@playwright/test";
import { startNewGame, talkThrough, waitForTitle, watchConsole } from "./helpers";

const state = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__tom!.session.state)));

test("something taken unseen is recognised by its owner later; the watchman settles it", async ({ page }) => {
  test.setTimeout(180_000);
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await page.evaluate(() => {
    const t = window.__tom!;
    t.session.state.worldMinutes = 10 * 60;
    t.game.npcs.snapToSchedule();
    // nobody about: an unseen theft from Raman's crate
    const slot = t.session.containerSlots("ct_raman_crate").findIndex((x) => x?.itemId === "produce");
    t.session.takeFromContainer("ct_raman_crate", slot, []);
    t.game.player.teleport([30, 0.3, 30], 0); // somewhere else entirely
  });
  let s = await state(page);
  expect(s.pendingCrime).toBeNull();
  expect(s.stolen.map((x: { ownerNpcId: string }) => x.ownerNpcId)).toEqual(["npc_villager_raman"]);
  await page.waitForTimeout(1200);
  expect((await state(page)).pendingCrime).toBeNull(); // far from Raman: nothing happens

  // walk up to Raman with his vegetables in the bag
  await page.evaluate(() => {
    const g = window.__tom!.game;
    const r = g.npcs.positionOf("npc_villager_raman");
    g.player.teleport([r.x + 2, r.y + 0.3, r.z + 1], 0);
    g.player.faceTowards(r);
  });
  await expect.poll(async () => (await state(page)).pendingCrime?.witnessId, { timeout: 5000 }).toBe("npc_villager_raman");
  await expect(page.getByTestId("crime-banner")).toBeVisible();
  s = await state(page);
  expect(s.stolen).toEqual([]);
  expect(s.flags.seen_stealing).toBe(true);
  await page.screenshot({ path: "test-results/screens/32-recognised.png" });

  // Kannan arrives and offers the usual choice: put it back
  await expect(page.getByTestId("dialogue")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId("dialogue")).toContainText("Kannan");
  await talkThrough(page);
  const after = await state(page);
  expect(after.pendingCrime).toBeNull();
  expect(after.inventory.some((x: { itemId: string } | null) => x?.itemId === "produce")).toBe(false);
  expect(log.errors).toEqual([]);
});
