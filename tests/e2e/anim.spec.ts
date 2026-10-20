import { test, expect } from "@playwright/test";
import { hold, pressE, startNewGame, teleport, waitForTitle, watchConsole } from "./helpers";

test.describe.configure({ mode: "serial" });

test("faces: blinking, gaze toward a target, a talking jaw; close-up", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  // the player blinks within a few seconds (sample the lid closure every frame)
  const maxLid = await page.evaluate(async () => {
    const g = window.__tom!.game;
    let max = 0;
    const t0 = performance.now();
    await new Promise<void>((res) => {
      const tick = () => {
        max = Math.max(max, g.player.face?.state.lid ?? 0);
        if (performance.now() - t0 < 7000) requestAnimationFrame(tick);
        else res();
      };
      requestAnimationFrame(tick);
    });
    return max;
  });
  expect(maxLid).toBeGreaterThan(0.6);
  // Valli talks: her jaw moves while the dialogue is open
  await page.evaluate(() => {
    window.__tom!.session.state.worldMinutes = 9 * 60;
    window.__tom!.game.npcs.snapToSchedule();
  });
  await teleport(page, 3.5, 40.8, Math.PI);
  await pressE(page);
  await expect(page.getByTestId("dialogue")).toBeVisible();
  const jaw = await page.evaluate(async () => {
    const npcs = window.__tom!.game.npcs as unknown as { npcs: Map<string, { face: { state: { jaw: number; gazeYaw: number } } | null }> };
    const f = npcs.npcs.get("npc_valli")!.face!;
    let max = 0;
    for (let i = 0; i < 90; i++) {
      max = Math.max(max, f.state.jaw);
      await new Promise((r) => requestAnimationFrame(r));
    }
    return max;
  });
  expect(jaw).toBeGreaterThan(0.05);
  // close-up of her face mid-sentence
  await page.evaluate(() => {
    const g = window.__tom!.game;
    const p = g.npcs.positionOf("npc_valli");
    const obj = (g.npcs as unknown as { npcs: Map<string, { object: { rotation: { y: number } } }> }).npcs.get("npc_valli")!.object;
    const yaw = obj.rotation.y + 0.45; // a three-quarter view from her front
    g.pause();
    g.camera.position.set(p.x + Math.sin(yaw) * 0.6, p.y + 1.5, p.z + Math.cos(yaw) * 0.6);
    g.camera.lookAt(p.x, p.y + 1.45, p.z);
  });
  await page.locator(".pause").evaluate((e) => ((e as HTMLElement).style.visibility = "hidden"));
  await page.waitForTimeout(200);
  await page.screenshot({ path: "test-results/screens/63-face-talking.png" });
  await page.evaluate(() => window.__tom!.game.resume());
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const settle = await page.evaluate(async () => {
    const npcs = window.__tom!.game.npcs as unknown as { npcs: Map<string, { face: { state: { jaw: number } } | null }> };
    await new Promise((r) => setTimeout(r, 600));
    return npcs.npcs.get("npc_valli")!.face!.state.jaw;
  });
  expect(settle).toBeLessThan(0.02); // mouth closes after the conversation
  expect(log.errors).toEqual([]);
});

test("the chest lid opens with the panel and closes with it; carrying a full pot; pushing a door", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  const lid = () => page.evaluate(() => {
    const l = window.__tom!.game.level.lids.get("home_chest")!;
    return l.node.rotation.x - l.baseRotX;
  });
  await teleport(page, -20.4, 30.3, -Math.PI / 2);
  await expect(page.getByTestId("prompt")).toContainText("chest");
  await pressE(page);
  await page.getByTestId("storage").waitFor();
  await page.waitForTimeout(700);
  expect(await lid()).toBeLessThan(-0.9);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  expect(await lid()).toBeGreaterThan(-0.15);

  // a full water pot: the carry walk at walking pace
  await page.evaluate(() => {
    const t = window.__tom!;
    const slot = t.session.state.inventory.findIndex((x) => x === null);
    t.session.state.inventory[slot] = { itemId: "water_vessel_full", quantity: 1 };
    t.session.advanceTime(1);
    t.game.player.teleport([0, 0.5, 20], Math.PI);
    t.game.cam.yaw = 0;
  });
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(1500);
  const carry = await page.evaluate(() => {
    const g = window.__tom!.game;
    return { carrying: g.player.carrying, speed: Math.hypot(g.player.velocity.x, g.player.velocity.z), w: g.player.animator.weights() };
  });
  await page.keyboard.up("KeyW");
  await page.keyboard.up("ShiftLeft");
  expect(carry.carrying).toBe(true);
  expect(carry.speed).toBeLessThan(2.3);
  expect(carry.w.carry_walk).toBeGreaterThan(0.6);
  await page.screenshot({ path: "test-results/screens/64-carrying.png" });
  // the pot is held in front of the belly: a front three-quarter view
  await page.evaluate(() => {
    const g = window.__tom!.game;
    const p = g.player.object.position;
    const yaw = g.player.object.rotation.y + 0.5;
    g.pause();
    g.camera.position.set(p.x + Math.sin(yaw) * 2.2, p.y + 1.4, p.z + Math.cos(yaw) * 2.2);
    g.camera.lookAt(p.x, p.y + 1.0, p.z);
  });
  await page.locator(".pause").evaluate((e) => ((e as HTMLElement).style.visibility = "hidden"));
  await page.waitForTimeout(200);
  await page.screenshot({ path: "test-results/screens/65-carrying-front.png" });
  await page.evaluate(() => window.__tom!.game.resume());

  // the door: a push, not a reach
  await page.evaluate(() => {
    const t = window.__tom!;
    t.session.state.inventory = t.session.state.inventory.map((x) => (x?.itemId === "water_vessel_full" ? null : x));
    t.session.advanceTime(1);
  });
  const d = await page.evaluate(() => {
    const g = window.__tom!.game;
    const def = window.__tom!.session.defs.doors.get("door_home")!;
    const box = g.level.doors.get(`${def.placementId}.${def.node}`)!.collider!;
    return [box.cx, box.cz];
  });
  await teleport(page, d[0]! + 1.2, d[1]!, -Math.PI / 2);
  await expect(page.getByTestId("prompt")).toContainText("door");
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => window.__tom!.game.player.animator.currentAction)).toBe("door_push");
  await hold(page, ["KeyS"], 200);
  expect(log.errors).toEqual([]);
});
