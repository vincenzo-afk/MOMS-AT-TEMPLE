import { test, expect } from "@playwright/test";
import { hold, pressE, startNewGame, talkThrough, teleport, waitForTitle, watchConsole } from "./helpers";

test.describe.configure({ mode: "serial" });

const weights = (page: import("@playwright/test").Page, who: "player" | string) =>
  page.evaluate((who) => {
    const g = window.__tom!.game;
    const anim = who === "player" ? g.player.animator : g.npcs.npcs.get(who)!.animator;
    return { weights: anim.weights(), current: anim.currentAction };
  }, who);

test("animation state machine: idle, walk, run, action exclusivity, NPC activities", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await page.waitForTimeout(600);
  let w = await weights(page, "player");
  expect(w.weights.idle_relaxed).toBeGreaterThan(0.9);

  await page.keyboard.down("KeyW");
  await page.waitForTimeout(900);
  w = await weights(page, "player");
  expect(w.weights.walk_forward).toBeGreaterThan(0.6);
  expect(w.weights.run_forward).toBeLessThan(0.2);
  await page.keyboard.down("ShiftLeft");
  await page.waitForTimeout(900);
  w = await weights(page, "player");
  expect(w.weights.run_forward).toBeGreaterThan(0.6);
  await page.screenshot({ path: "test-results/screens/10-running.png" });
  await page.keyboard.up("ShiftLeft");
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(900);
  w = await weights(page, "player");
  expect(w.weights.idle_relaxed).toBeGreaterThan(0.8);

  // gather: pickup plays alone, locomotion faded out, movement locked
  await page.evaluate(() => (window.__tom!.session.state.worldMinutes = 9 * 60));
  await teleport(page, -21.3, 4.5, -Math.PI / 2);
  await pressE(page);
  w = await weights(page, "player");
  expect(w.current).toBe("gather_flower");
  const before = await page.evaluate(() => window.__tom!.game.player.position.toArray());
  await hold(page, ["KeyW"], 300);
  const after = await page.evaluate(() => window.__tom!.game.player.position.toArray());
  expect(Math.hypot(after[0]! - before[0]!, after[2]! - before[2]!)).toBeLessThan(0.05);
  await page.waitForTimeout(400);
  w = await weights(page, "player");
  expect(w.weights.walk_forward ?? 0).toBeLessThan(0.05);

  // NPCs: Velan works at his bench, Amudha tends the beds, Selvam trades at his stall
  await page.evaluate(() => window.__tom!.game.npcs.snapToSchedule());
  await page.waitForTimeout(500);
  expect((await weights(page, "npc_velan")).current).toBe("craft_at_station");
  expect((await weights(page, "npc_amudha")).current).toBe("garden_kneel");
  expect((await weights(page, "npc_selvam")).current).toBe("trade_counter");
  expect(log.errors).toEqual([]);
});

test("NPC schedule transition: Amudha walks from the garden to rest at midday", async ({ page }) => {
  await waitForTitle(page);
  await startNewGame(page);
  await page.evaluate(() => {
    const t = window.__tom!;
    t.session.state.worldMinutes = 11 * 60 + 59.5;
    t.game.npcs.snapToSchedule();
  });
  const start = await page.evaluate(() => window.__tom!.game.npcs.positionOf("npc_amudha").toArray());
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const n = window.__tom!.game.npcs.npcs.get("npc_amudha")!;
    return { pos: n.object.position.toArray(), anchor: n.anchorId, path: n.path.length, speed: n.speed };
  });
  expect(r.anchor).toBe("anc_amudha_rest");
  expect(r.path).toBeGreaterThan(0);
  expect(Math.hypot(r.pos[0]! - start[0]!, r.pos[2]! - start[2]!)).toBeGreaterThan(1.5);
});

test("follow-up: garland quest through trade and craft UI, garland appears on the gate", async ({ page }) => {
  test.setTimeout(180_000);
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  // fast-forward to the end of "The Silent Channel" through the rules engine (that path is covered by the loop test)
  await page.evaluate(() => {
    const s = window.__tom!.session;
    s.state.worldMinutes = 10 * 60;
    s.startQuest("q_arrival");
    for (const n of [1, 2, 3]) s.gather(`gn_jasmine_${n}`);
    s.talk("npc_valli");
    while (s.conversation) s.choose(0);
    s.talk("npc_amudha");
    while (s.conversation) s.choose(0);
    s.inspectRestoration("rest_channel_east");
    s.talk("npc_velan");
    s.endConversation();
    for (const n of [1, 2, 3, 4]) s.gather(`gn_stone_${n}`);
    s.gather("gn_clay_1");
    s.gather("gn_clay_2");
    s.craft("r_lime_mortar");
    s.repair("rest_channel_east");
    s.talk("npc_amudha");
    while (s.conversation) s.choose(0);
    window.__tom!.game.npcs.snapToSchedule();
    window.__tom!.game.closePanel(); // the scripted inspect opened the inspect panel
  });
  expect(await page.evaluate(() => window.__tom!.session.state.quests.q_garland?.status)).toBe("active");

  for (const [x, z] of [[21.5, -23.6], [28.5, -23.6]] as Array<[number, number]>) {
    await teleport(page, x, z, Math.PI);
    await expect(page.getByTestId("prompt")).toContainText("marigold");
    await pressE(page);
    await page.waitForTimeout(1600);
  }
  for (const z of [21.0, 23.2]) {
    await teleport(page, -21.3, z, -Math.PI / 2);
    await pressE(page);
    await page.waitForTimeout(2100); // gather_flower locks movement for 1.8 s
  }
  expect(await page.evaluate(() => window.__tom!.session.currentObjective("q_garland")?.id)).toBe("twine");

  // trade UI
  await teleport(page, 17.4, 30, Math.PI / 2);
  await expect(page.getByTestId("prompt")).toContainText("Selvam");
  await pressE(page);
  await page.keyboard.press("Space"); // past the first line of Selvam's well request
  await page.getByRole("button", { name: /goods/ }).click(); // Selvam offers the well quest first; choose his goods
  await expect(page.getByTestId("shop")).toBeVisible();
  await page.screenshot({ path: "test-results/screens/11-shop.png" });
  await page.getByTestId("buy-banana_twine").click();
  await page.keyboard.press("Escape");

  // craft UI
  await teleport(page, 25.0, 8, -Math.PI / 2);
  await pressE(page);
  await page.getByTestId("craft-r_flower_garland").click();
  await page.waitForTimeout(3400);

  // deliver to Valli
  await teleport(page, 3.5, 40.8, Math.PI);
  await pressE(page);
  await talkThrough(page);
  const s = await page.evaluate(() => JSON.parse(JSON.stringify(window.__tom!.session.state)));
  expect(s.quests.q_garland.status).toBe("completed");
  expect(s.record.at(-1).id).toBe("community:q_garland");
  expect(s.record.at(-1).causeEventIds).toEqual(["consequence:rest_garden_main"]);
  expect(await page.evaluate(() => window.__tom!.game.level.byId.get("gate_garland")!.visible)).toBe(true);
  await page.evaluate(() => {
    const g = window.__tom!.game;
    g.player.teleport([0, 0, 38], 0);
    g.cam.yaw = Math.PI;
    g.cam.pitch = 0.05;
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/screens/12-gate-garland.png" });
  expect(log.errors).toEqual([]);
});

test("opening sequence plays and can be skipped", async ({ page }) => {
  await waitForTitle(page);
  await page.evaluate(async () => {
    const t = window.__tom!;
    t.game.settings = { ...t.game.settings, showIntro: true };
    await t.saves.deleteSave();
  });
  await page.getByTestId("new-game").click();
  await expect(page.getByTestId("intro")).toBeVisible();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "test-results/screens/13-intro.png" });
  await page.getByTestId("skip-intro").click();
  await expect(page.getByTestId("hud")).toBeVisible();
});

test("review shots and performance sample", async ({ page }) => {
  await waitForTitle(page);
  await startNewGame(page);
  await page.evaluate(() => {
    const t = window.__tom!;
    t.session.state.worldMinutes = 10 * 60;
    t.game.npcs.snapToSchedule();
  });
  const shots: Array<[string, [number, number, number], number, number]> = [
    ["20-valli", [3.5, 0, 42.6], 0, 0.15],
    ["21-temple", [0, 0, 6], 0, 0.18],
    ["22-street", [-18, 0, 20], -0.6, 0.25],
    ["23-workshop", [21.5, 0, 8], -Math.PI / 2 - 0.3, 0.2],
    ["24-old-grounds", [-22, 0, -24], -0.8, 0.25],
  ];
  for (const [name, pos, yaw, pitch] of shots) {
    await page.evaluate(
      ([pos, yaw, pitch]) => {
        const g = window.__tom!.game;
        g.player.teleport(pos as [number, number, number], (yaw as number) + Math.PI);
        g.cam.yaw = yaw as number;
        g.cam.pitch = pitch as number;
      },
      [pos, yaw, pitch] as const,
    );
    await page.waitForTimeout(900);
    await page.screenshot({ path: `test-results/screens/${name}.png` });
  }
  // performance: sample frame statistics in the courtyard
  await page.evaluate(() => window.__tom!.game.player.teleport([0, 0, 20], Math.PI));
  await page.waitForTimeout(4000);
  const perf = await page.evaluate(() => {
    const g = window.__tom!.game;
    return { ...g.stats, gpu: (() => {
      const gl = g.renderer.getContext();
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
    })(), memory: g.renderer.info.memory };
  });
  console.log("PERF", JSON.stringify(perf));
  expect(perf.drawCalls).toBeGreaterThan(0);
});
