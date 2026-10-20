import { test, expect, type Page } from "@playwright/test";
import { hold, pressE, startNewGame, talkThrough, teleport, waitForTitle, watchConsole } from "./helpers";
import { kindAt } from "../../src/game/world/weather";
import { SHELTER_ANCHORS } from "../../src/data/world";

test.describe.configure({ mode: "serial" });

const state = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__tom!.session.state)));
const setHour = (page: Page, hour: number, day = 0) =>
  page.evaluate(
    ([h, d]) => {
      window.__tom!.session.state.worldMinutes = d! * 1440 + h! * 60;
      window.__tom!.game.npcs.snapToSchedule();
    },
    [hour, day],
  );

/** Door centre, and the unit direction from the building's centre out through the doorway. */
async function doorway(page: Page, doorId: string) {
  return page.evaluate((doorId) => {
    const g = window.__tom!.game;
    const d = window.__tom!.session.defs.doors.get(doorId)!;
    const box = g.level.doors.get(`${d.placementId}.${d.node}`)!.collider!;
    const house = g.level.byId.get(d.placementId)!;
    const dx = box.cx - house.position.x;
    const dz = box.cz - house.position.z;
    const l = Math.hypot(dx, dz);
    return { x: box.cx, z: box.cz, ox: dx / l, oz: dz / l };
  }, doorId);
}

test("home door: open, walk inside (indoors), close it behind you and stay inside", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await setHour(page, 9);
  const d = await doorway(page, "door_home");
  await teleport(page, d.x + d.ox * 1.3, d.z + d.oz * 1.3);
  await expect(page.getByTestId("prompt")).toContainText("your door");
  await pressE(page);
  expect((await state(page)).doors.door_home).toBe(true);
  await page.waitForTimeout(900); // leaf swings open; collider is off while open

  // walk in through the doorway (camera yaw so W heads against the outward direction)
  await page.evaluate(([ox, oz]) => (window.__tom!.game.cam.yaw = Math.atan2(ox!, oz!)), [d.ox, d.oz]);
  await hold(page, ["KeyW"], 1300);
  await expect.poll(() => page.evaluate(() => window.__tom!.game.ui.get().indoors)).toBe(true);
  await expect(page.getByTestId("hud-time")).toContainText("indoors");
  await page.screenshot({ path: "test-results/screens/30-home-interior.png" });

  // close from inside, then try to walk out: the door collider holds us in
  await teleport(page, d.x - d.ox * 1.2, d.z - d.oz * 1.2);
  await expect(page.getByTestId("prompt")).toContainText("your door");
  await pressE(page);
  expect((await state(page)).doors.door_home).toBe(false);
  await page.waitForTimeout(900);
  await page.evaluate(([ox, oz]) => (window.__tom!.game.cam.yaw = Math.atan2(-ox!, -oz!)), [d.ox, d.oz]);
  await hold(page, ["KeyW"], 1200);
  const p = await page.evaluate(() => window.__tom!.game.player.position.toArray());
  const outward = (p[0]! - d.x) * d.ox + (p[2]! - d.z) * d.oz;
  expect(outward).toBeLessThan(0); // still on the inside of the doorway
  expect(log.errors).toEqual([]);
});

test("granary is barred at night until Selvam lends his key", async ({ page }) => {
  await waitForTitle(page);
  await startNewGame(page);
  await setHour(page, 22);
  const d = await doorway(page, "door_granary");
  await teleport(page, d.x + d.ox * 1.3, d.z + d.oz * 1.3);
  await expect(page.getByTestId("prompt")).toContainText("granary door");
  await pressE(page);
  expect((await state(page)).doors.door_granary ?? false).toBe(false);
  await expect(page.locator(".toast").filter({ hasText: /Kannan|barred|locked/i }).first()).toBeVisible();
  await page.evaluate(() => (window.__tom!.session.state.flags.granary_key = true));
  await page.waitForTimeout(400); // interaction cooldown
  await pressE(page);
  expect((await state(page)).doors.door_granary).toBe(true);
});

test("theft in view of the owner: watchman pursues, confronts, and the goods go back", async ({ page }) => {
  test.setTimeout(180_000);
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await setHour(page, 10);
  await teleport(page, 55.2, 4.6, 0);
  await expect(page.getByTestId("prompt")).toContainText("crate");
  const witnesses = await page.evaluate(() => window.__tom!.game.npcs.witnessesOf(window.__tom!.game.player.position));
  expect(witnesses).toContain("npc_villager_raman");
  await pressE(page);
  await expect(page.getByTestId("container")).toBeVisible();
  await expect(page.getByTestId("container")).toContainText("belongs to Raman");
  await page.getByTestId("take-produce").first().click();
  await expect(page.getByTestId("crime-banner")).toBeVisible();
  const s = await state(page);
  expect(s.pendingCrime.containerId).toBe("ct_raman_crate");
  expect(s.inventory.some((x: { itemId: string } | null) => x?.itemId === "produce")).toBe(true);

  // Kannan comes running from the granary and confronts the player
  const start = await page.evaluate(() => window.__tom!.game.npcs.positionOf("npc_kaaval").toArray());
  await expect(page.getByTestId("dialogue")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId("dialogue")).toContainText("Kannan");
  const end = await page.evaluate(() => window.__tom!.game.npcs.positionOf("npc_kaaval").toArray());
  expect(Math.hypot(end[0]! - start[0]!, end[2]! - start[2]!)).toBeGreaterThan(10);
  await page.screenshot({ path: "test-results/screens/31-watchman.png" });
  await talkThrough(page); // first option: put it back
  const after = await state(page);
  expect(after.pendingCrime).toBeNull();
  expect(after.inventory.some((x: { itemId: string } | null) => x?.itemId === "produce")).toBe(false);
  await expect(page.getByTestId("crime-banner")).toHaveCount(0);
  expect(log.errors).toEqual([]);
});

test("pickups are real items taken once; topics answer within each villager's knowledge", async ({ page }) => {
  await waitForTitle(page);
  await startNewGame(page);
  await setHour(page, 9);
  await teleport(page, -66.5, -40.4, 0);
  await expect(page.getByTestId("prompt")).toContainText("chisel");
  await pressE(page);
  expect((await state(page)).pickedUp).toContain("pk_chisel");
  await page.waitForTimeout(400);
  await expect(page.getByTestId("prompt").filter({ hasText: "chisel" })).toHaveCount(0);

  // Valli: first conversation offers her task; the second shows "Ask about" topics
  await teleport(page, 3.5, 40.8, Math.PI);
  await expect(page.getByTestId("prompt")).toContainText("Talk to Valli");
  await pressE(page);
  await talkThrough(page);
  await page.waitForTimeout(500);
  await pressE(page);
  for (let i = 0; i < 6 && !(await page.getByTestId("topics").isVisible()); i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(150);
  }
  await expect(page.getByTestId("topics")).toBeVisible();
  await page.getByTestId("topic-t_ruins").click();
  const ans = await page.getByTestId("dialogue-text").textContent();
  expect(ans!.length).toBeGreaterThan(10);
  await page.screenshot({ path: "test-results/screens/32-topics.png" });
  while (await page.getByTestId("dialogue").isVisible()) {
    const bye = page.getByTestId("goodbye");
    if (await bye.isVisible()) await bye.click();
    else await page.keyboard.press("Space");
    await page.waitForTimeout(150);
  }
  const s = await state(page);
  expect(s.talkLog.some((t: { npcId: string; text: string }) => t.npcId === "npc_valli" && t.text === ans)).toBe(true);
  await page.keyboard.press("KeyJ");
  await expect(page.getByTestId("talklog")).toBeVisible();
});

test("key remapping persists and drives input", async ({ page }) => {
  await waitForTitle(page);
  await startNewGame(page);
  await page.keyboard.press("Escape");
  await page.getByTestId("pause").waitFor();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByTestId("remap").locator("summary").click();
  await page.getByTestId("remap-forward").click();
  await page.keyboard.press("KeyI");
  await expect(page.getByTestId("remap-forward")).toHaveText("I");
  expect(await page.evaluate(() => window.__tom!.game.input.keysFor("forward"))).toEqual(["KeyI"]);
  // I was the inventory key: it is removed there so one key drives one action
  expect(await page.evaluate(() => window.__tom!.game.input.keysFor("inventory"))).not.toContain("KeyI");
  const saved = await page.evaluate(async () => (await window.__tom!.saves.loadSettings())?.keyBindings);
  expect(saved?.forward).toEqual(["KeyI"]);
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByTestId("resume").click();
  const before = await page.evaluate(() => window.__tom!.game.player.position.toArray());
  await hold(page, ["KeyI"], 900);
  const after = await page.evaluate(() => window.__tom!.game.player.position.toArray());
  expect(Math.hypot(after[0]! - before[0]!, after[2]! - before[2]!)).toBeGreaterThan(0.8);
  await page.evaluate(() => window.__tom!.game.applySettings({ ...window.__tom!.game.settings, keyBindings: {} }));
  expect(await page.evaluate(() => window.__tom!.game.input.keysFor("forward"))).toContain("KeyW");
});

test("weather: deterministic rain sends villagers to shelter; NPC tiers and steering stats", async ({ page }) => {
  test.setTimeout(180_000);
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  // find a rainy midday block on a later day (pure function of time, same as the game)
  let rainy = -1;
  for (let m = 1440 + 9 * 60; m < 1440 * 20; m += 180) if (kindAt(m + 60) === "rain" && kindAt(m - 120) === "rain") { rainy = m + 60; break; }
  expect(rainy).toBeGreaterThan(0);
  await page.evaluate((m) => {
    window.__tom!.session.state.worldMinutes = m;
    window.__tom!.game.npcs.snapToSchedule();
  }, rainy);
  await teleport(page, 60, 2, 0);
  await expect.poll(() => page.evaluate(() => window.__tom!.game.ui.get().weather), { timeout: 10_000 }).toBe("rain");
  await expect(page.getByTestId("hud-time")).toContainText("Rain");
  await page.waitForTimeout(8000); // villagers walk to cover
  await page.screenshot({ path: "test-results/screens/33-rain.png" });
  const info = await page.evaluate(() => {
    const g = window.__tom!.game;
    const ids = [...window.__tom!.session.defs.npcs.keys()];
    return { stats: { ...g.npcs.stats }, total: ids.length };
  });
  console.log("NPCSTATS", JSON.stringify(info));
  // the schedule redirects outdoor villagers to cover: count NPCs at, or walking to, a shelter anchor
  const sheltering = await page.evaluate((anchors) => {
    const t = window.__tom!;
    return [...t.session.defs.npcs.keys()].filter((id) => anchors.includes(t.game.npcs.currentAnchor(id) ?? "")).length;
  }, SHELTER_ANCHORS);
  console.log("SHELTERING", sheltering);
  expect(sheltering).toBeGreaterThanOrEqual(3);
  // and they leave once it clears: same NPCs return to their scheduled anchors
  let clear = rainy;
  while (kindAt(clear) === "rain") clear += 180;
  await page.evaluate((m) => (window.__tom!.session.state.worldMinutes = m + 60), clear);
  await expect
    .poll(() => page.evaluate((anchors) => [...window.__tom!.session.defs.npcs.keys()].filter((id) => anchors.includes(window.__tom!.game.npcs.currentAnchor(id) ?? "")).length, SHELTER_ANCHORS), { timeout: 20_000 })
    .toBeLessThan(sheltering);
  expect(info.stats.full + info.stats.mid + info.stats.far).toBeGreaterThan(0);
  expect(log.errors).toEqual([]);
});

test("gamepad drives movement and interaction; soundscape, footsteps and tree LOD are live", async ({ page }) => {
  // a scripted pad: tests write window.__pad, the game reads it through navigator.getGamepads()
  await page.addInitScript(() => {
    const w = window as unknown as { __pad: { axes: number[]; buttons: number[] } };
    w.__pad = { axes: [0, 0, 0, 0], buttons: new Array(17).fill(0) };
    navigator.getGamepads = () =>
      [{ id: "test pad", index: 0, connected: true, mapping: "standard", timestamp: performance.now(), axes: w.__pad.axes, buttons: w.__pad.buttons.map((v) => ({ pressed: v > 0.5, touched: v > 0, value: v })) }] as unknown as (Gamepad | null)[];
  });
  const pad = (axes: number[], buttons: Record<number, number> = {}) =>
    page.evaluate(
      ([axes, buttons]) => {
        const w = window as unknown as { __pad: { axes: number[]; buttons: number[] } };
        w.__pad.axes = axes as number[];
        w.__pad.buttons = new Array(17).fill(0).map((_, i) => (buttons as Record<number, number>)[i] ?? 0);
      },
      [axes, buttons] as const,
    );
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await setHour(page, 9);
  expect(await page.evaluate(() => window.__tom!.game.input.gamepadConnected)).toBe(true);

  // left stick forward walks north (camera yaw 0); a half-tilt walks slower than a full tilt
  await page.evaluate(() => (window.__tom!.game.cam.yaw = 0));
  const pos = () => page.evaluate(() => window.__tom!.game.player.position.toArray());
  const a = await pos();
  await pad([0, -1, 0, 0]);
  await page.waitForTimeout(1000);
  await pad([0, 0, 0, 0]);
  const b = await pos();
  await pad([0, -0.55, 0, 0]);
  await page.waitForTimeout(1000);
  await pad([0, 0, 0, 0]);
  const c = await pos();
  const full = a[2]! - b[2]!;
  const half = b[2]! - c[2]!;
  expect(full).toBeGreaterThan(1);
  expect(half).toBeGreaterThan(0.2);
  expect(half).toBeLessThan(full);

  // footsteps from the real walk cycle; the procedural soundscape exists once audio is unlocked
  const audio = await page.evaluate(() => ({ steps: window.__tom!.game.audio.cueCounts.footstep ?? 0, scape: !!window.__tom!.game.audio.soundscape }));
  expect(audio.steps).toBeGreaterThan(2);
  expect(audio.scape).toBe(true);

  // A button talks to Valli
  await teleport(page, 3.5, 40.8, Math.PI);
  await expect(page.getByTestId("prompt")).toContainText("Talk to Valli");
  await pad([0, 0, 0, 0], { 0: 1 });
  await page.waitForTimeout(120);
  await pad([0, 0, 0, 0]);
  await expect(page.getByTestId("dialogue")).toBeVisible();
  await talkThrough(page);

  // tree LOD: render the same view with every chunk forced to full detail and compare
  await page.evaluate(() => window.__tom!.game.player.teleport([0, 0, 20], Math.PI));
  await page.waitForTimeout(1500);
  const tris = await page.evaluate(() => {
    const g = window.__tom!.game as unknown as {
      renderer: { info: { render: { triangles: number } }; render: (s: unknown, c: unknown) => void };
      scene: unknown;
      camera: unknown;
      level: { lodChunks: Array<{ near: Array<{ visible: boolean }>; far: Array<{ visible: boolean }> }> };
    };
    g.renderer.render(g.scene, g.camera);
    const lod = g.renderer.info.render.triangles;
    const saved = g.level.lodChunks.map((ch) => ch.near.map((o) => o.visible));
    for (const ch of g.level.lodChunks) {
      ch.near.forEach((o) => (o.visible = true));
      ch.far.forEach((o) => (o.visible = false));
    }
    g.renderer.render(g.scene, g.camera);
    const fullDetail = g.renderer.info.render.triangles;
    g.level.lodChunks.forEach((ch, i) => {
      ch.near.forEach((o, j) => (o.visible = saved[i]![j]!));
      ch.far.forEach((o, j) => (o.visible = !saved[i]![j]!));
    });
    return { lod, fullDetail, chunks: g.level.lodChunks.length };
  });
  console.log("LOD", JSON.stringify(tris));
  expect(tris.chunks).toBeGreaterThan(0);
  expect(tris.lod).toBeLessThan(tris.fullDetail);
  expect(log.errors).toEqual([]);
});

test("villagers notice the player: a greeting bubble appears above the speaker", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await setHour(page, 9);
  await teleport(page, 3.5, 40.8, Math.PI); // the usual spot for talking to Valli at the gate
  await page.evaluate(() => (window.__tom!.game.cam.yaw = Math.PI * 0.8));
  await expect(page.locator(".bubble").first()).toBeVisible({ timeout: 10_000 });
  const box = await page.locator(".bubble").first().boundingBox();
  expect(box!.y).toBeGreaterThan(0);
  expect(box!.y).toBeLessThan(760);
  await page.screenshot({ path: "test-results/screens/34-greeting.png" });
  expect(log.errors).toEqual([]);
});
