import { test, expect } from "@playwright/test";
import { hold, pressE, startNewGame, talkThrough, teleport, waitForTitle, watchConsole } from "./helpers";

test.describe.configure({ mode: "serial" });

test("boots to the title screen with every model loaded and no console errors", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  const info = await page.evaluate(() => {
    const g = window.__tom!.game;
    return { problems: g.assets.problems, manifest: g.assets.manifest?.assets.length, colliders: g.level.stats.colliders, instanced: g.level.stats.instancedDraws };
  });
  expect(info.problems).toEqual([]);
  expect(info.manifest).toBeGreaterThan(30);
  expect(info.colliders).toBeGreaterThan(100);
  await page.screenshot({ path: "test-results/screens/01-title.png" });
  expect(log.errors).toEqual([]);
});

test("player moves, runs, collides and the camera follows", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  const pos = () => page.evaluate(() => window.__tom!.game.player.position.toArray());
  const start = await pos();
  await hold(page, ["KeyW"], 1200);
  const walked = await pos();
  expect(start[2]! - walked[2]!).toBeGreaterThan(1.2); // moved north (toward the gate)

  await hold(page, ["ShiftLeft", "KeyW"], 1200);
  const ran = await pos();
  expect(walked[2]! - ran[2]!).toBeGreaterThan(walked[2]! - start[2]!); // running covers more ground

  // camera-relative movement: rotate the camera 90 degrees, W now moves west
  await page.evaluate(() => (window.__tom!.game.cam.yaw = Math.PI / 2));
  const before = await pos();
  await hold(page, ["KeyW"], 800);
  const after = await pos();
  expect(before[0]! - after[0]!).toBeGreaterThan(0.8);

  // collision: walk into the gopuram pier and stay outside its box
  await teleport(page, -4.5, 51.5);
  await page.evaluate(() => (window.__tom!.game.cam.yaw = 0));
  await hold(page, ["KeyW"], 1500);
  const blocked = await pos();
  expect(blocked[2]!).toBeGreaterThan(48.4); // pier front face at z = 48.6 (+ player radius)

  // camera keeps a distance from the player and never ends up inside the pier
  const camDist = await page.evaluate(() => window.__tom!.game.camera.position.distanceTo(window.__tom!.game.player.position));
  expect(camDist).toBeGreaterThan(0.5);
  await page.screenshot({ path: "test-results/screens/02-gate.png" });
  expect(log.errors).toEqual([]);
});

test("complete loop: welcome, channel restoration, garden, Living Record, save and reload", async ({ page }) => {
  test.setTimeout(240_000);
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__tom!.session.state)));

  // 1-3: meet Valli at the gate and accept the first task
  await page.evaluate(() => (window.__tom!.session.state.worldMinutes = 9 * 60)); // daytime schedule
  await page.evaluate(() => window.__tom!.game.npcs.snapToSchedule());
  await teleport(page, 3.5, 40.8, Math.PI);
  await expect(page.getByTestId("prompt")).toContainText("Talk to Valli");
  await pressE(page);
  await expect(page.getByTestId("dialogue")).toBeVisible();
  await talkThrough(page);
  expect((await state()).quests.q_arrival.status).toBe("active");

  // 4-5: gather jasmine on the west street
  for (const z of [4.5, 11.5, 14.5]) {
    await teleport(page, -19, z, -Math.PI / 2);
    await expect(page.getByTestId("prompt")).toContainText("jasmine");
    await pressE(page);
    await page.waitForTimeout(2100); // gather_flower animation locks movement for 1.8 s
  }
  let s = await state();
  expect(s.inventory.filter(Boolean).find((x: { itemId: string }) => x.itemId === "jasmine_flower").quantity).toBe(3);
  await page.keyboard.press("KeyI");
  await expect(page.getByTestId("slot-jasmine_flower")).toBeVisible();
  await page.screenshot({ path: "test-results/screens/03-inventory.png" });
  await page.keyboard.press("Escape");

  await teleport(page, 3.5, 40.8, Math.PI);
  await pressE(page);
  await talkThrough(page);
  s = await state();
  expect(s.quests.q_arrival.status).toBe("completed");
  expect(s.coins).toBe(5);

  // Amudha in the garden starts the channel quest
  await teleport(page, 25, -20.2, Math.PI);
  await expect(page.getByTestId("prompt")).toContainText("Amudha");
  await pressE(page);
  await talkThrough(page);
  expect((await state()).quests.q_channel.status).toBe("active");

  // inspect the channel (secondary/primary depends on availability: inspect is the only verb now)
  await teleport(page, 24.9, -28.2, Math.PI);
  await expect(page.getByTestId("prompt")).toContainText("Inspect");
  await page.screenshot({ path: "test-results/screens/04-channel-blocked.png" });
  await pressE(page);
  await expect(page.getByTestId("inspect")).toBeVisible();
  await page.keyboard.press("Escape");

  // Velan teaches mortar
  await teleport(page, 25.4, 8, -Math.PI / 2);
  await page.evaluate(() => window.__tom!.game.player.faceTowards(window.__tom!.game.npcs.positionOf("npc_velan")));
  // the bench is also near: target Velan by standing beside him
  await teleport(page, 27.6, 5.6, 0);
  await expect(page.getByTestId("prompt")).toContainText("Velan");
  await pressE(page);
  await talkThrough(page);
  expect((await state()).flags.learned_mortar).toBe(true);

  // stones from the old grounds, clay from the bank
  for (const [x, z] of [[-24, -28.6], [-21, -26.1], [-23, -34.1], [-28, -39.1]] as Array<[number, number]>) {
    await teleport(page, x, z, Math.PI);
    await expect(page.getByTestId("prompt")).toContainText("masonry");
    await pressE(page);
    await page.waitForTimeout(1600);
  }
  for (const [x, z] of [[15.5, -33.0], [14.2, -33.0]] as Array<[number, number]>) {
    await teleport(page, x, z, Math.PI);
    await pressE(page);
    await page.waitForTimeout(1600);
  }
  expect((await state()).quests.q_channel.objectiveIndex).toBe(4); // craft mortar

  // craft at the bench (reject first: nothing to craft without learning garland)
  await teleport(page, 25.0, 8, -Math.PI / 2);
  await expect(page.getByTestId("prompt")).toContainText("workbench");
  await pressE(page);
  await expect(page.getByTestId("craft")).toBeVisible();
  await page.getByTestId("craft-r_lime_mortar").click();
  await page.waitForTimeout(2800);
  expect((await state()).quests.q_channel.objectiveIndex).toBe(5);

  // repair the channel
  await teleport(page, 24.9, -28.2, Math.PI);
  await expect(page.getByTestId("prompt")).toContainText("Repair");
  await pressE(page);
  await page.waitForTimeout(3000);
  s = await state();
  expect(s.restorations.rest_channel_east).toBe("flowing");
  expect(s.restorations.rest_garden_main).toBe("recovering");
  const visuals = await page.evaluate(() => {
    const byId = window.__tom!.game.level.byId;
    let withered = true;
    byId.get("bed_1")!.traverse((o) => {
      if (o.name === "STATE_withered") withered = o.visible;
    });
    return { blocked: byId.get("channel_blocked")!.visible, restored: byId.get("channel_restored")!.visible, withered };
  });
  expect(visuals).toEqual({ blocked: false, restored: true, withered: false });
  await page.screenshot({ path: "test-results/screens/05-channel-restored.png" });

  // follow-up objective appears after reporting to Amudha
  await teleport(page, 25, -20.2, Math.PI);
  await pressE(page);
  await talkThrough(page);
  s = await state();
  expect(s.quests.q_channel.status).toBe("completed");
  expect(s.quests.q_garland?.status).toBe("active");

  // Living Record shows the restoration and its consequence
  await page.keyboard.press("KeyL");
  await expect(page.getByTestId("record-restoration:rest_channel_east")).toBeVisible();
  await expect(page.getByTestId("record-consequence:rest_garden_main")).toContainText("Because");
  await page.screenshot({ path: "test-results/screens/06-living-record.png" });
  await page.keyboard.press("Escape");

  // save via the pause menu, reload the page, continue
  await page.evaluate(() => window.__tom!.game.pause());
  await page.getByTestId("save").click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const coinsBefore = (await state()).coins;
  await page.reload();
  await page.getByTestId("title").waitFor({ timeout: 90_000 });
  await page.getByTestId("continue").click();
  await page.getByTestId("hud").waitFor();
  s = await state();
  expect(s.restorations.rest_channel_east).toBe("flowing");
  expect(s.record.map((e: { id: string }) => e.id)).toEqual(["arrival:q_arrival", "restoration:rest_channel_east", "consequence:rest_garden_main"]);
  expect(s.coins).toBe(coinsBefore);
  const restoredVisible = await page.evaluate(() => window.__tom!.game.level.byId.get("channel_restored")!.visible);
  expect(restoredVisible).toBe(true);

  // repeated completion is impossible: repair verb no longer offered, rewards not re-granted
  await teleport(page, 24.9, -28.2, Math.PI);
  await expect(page.getByTestId("prompt")).not.toContainText("Repair");
  expect((await state()).coins).toBe(coinsBefore);
  expect(log.errors).toEqual([]);
});

test("missing optional model falls back without breaking the game", async ({ page }) => {
  const log = watchConsole(page);
  await page.route("**/PRP_Banana_Plant_B.glb", (r) => r.fulfill({ status: 404, body: "missing" }));
  await waitForTitle(page);
  const problems = await page.evaluate(() => window.__tom!.game.assets.problems.map((p) => p.id));
  expect(problems).toEqual(["PRP_Banana_Plant_B"]);
  await expect(page.getByText(/Some assets failed to load/)).toBeVisible();
  const nonResource = log.errors.filter((e) => !e.includes("404") && !e.includes("Failed to load resource"));
  expect(nonResource).toEqual([]);
});

test("corrupted save falls back to the backup and reports it", async ({ page }) => {
  await waitForTitle(page);
  await startNewGame(page);
  await page.evaluate(async () => {
    const t = window.__tom!;
    t.session.state.coins = 7;
    await t.game.saveGame();
    t.session.state.coins = 9;
    await t.game.saveGame();
    await t.saves.writeRawForTesting({ schemaVersion: 1, player: "garbage" });
  });
  await page.reload();
  await page.getByTestId("continue").click();
  await page.getByTestId("hud").waitFor();
  expect(await page.evaluate(() => window.__tom!.session.state.coins)).toBe(7);
  await expect(page.getByText(/loaded the backup/)).toBeVisible();
});

test("settings change audio bus gains and persist", async ({ page }) => {
  await waitForTitle(page);
  await startNewGame(page);
  await page.evaluate(() => window.__tom!.game.pause());
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByTestId("setting-masterVolume").fill("0.5");
  await page.getByTestId("setting-effectsVolume").fill("0.4");
  const gain = await page.evaluate(() => window.__tom!.game.audio.busGain("effects"));
  expect(gain).toBeCloseTo(0.2, 2);
  await page.reload();
  await page.getByTestId("title").waitFor({ timeout: 90_000 });
  expect(await page.evaluate(() => window.__tom!.game.settings.masterVolume)).toBe(0.5);
});
