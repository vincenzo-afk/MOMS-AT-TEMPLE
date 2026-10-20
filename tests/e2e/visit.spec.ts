import { test, expect, type Page } from "@playwright/test";
import { hold, waitForTitle, watchConsole } from "./helpers";

test.describe.configure({ mode: "serial" });

type VisitUiLite = { pradakshina: number; punya: number; blessings: number; stress: number; stage: string; objective: string; mini: { kind: string } | null; queue: { progress: number; length: number; lane: number } | null; driving: boolean; summary: unknown };
const visit = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__tom!.game.ui.get().visit)) as VisitUiLite);
const done = (page: Page) => page.evaluate(() => [...(window.__tom!.game.visit?.run.done ?? [])]);

async function startVisit(page: Page, mom = "devotional", temple = "city") {
  await page.evaluate(async () => {
    const t = window.__tom!;
    t.game.settings = { ...t.game.settings, showIntro: false, typewriter: false };
  });
  await page.getByTestId("temple-visit").click();
  await page.getByTestId("visit-menu").waitFor();
  await page.getByTestId(`mom-${mom}`).click();
  await page.getByTestId(`temple-${temple}`).click();
  await page.getByTestId("start-visit").click();
  await page.getByTestId("visit-hud").waitFor();
}

/** Stand at a station (by its interactable refId), from whichever side the interaction system accepts, and press E. */
async function useStation(page: Page, key: string, label: RegExp) {
  const ok = await page.evaluate((key) => {
    const g = window.__tom!.game;
    type Src = { def: { refId: string; kind: string }; position: () => { x: number; y: number; z: number } };
    const src = (g.interaction as unknown as { sources: Src[] }).sources.find((s) => s.def.kind === "visit" && s.def.refId === key)!;
    const p = src.position();
    for (const d of [0.9, 1.3, 0.6])
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const x = p.x + Math.sin(a) * d;
        const z = p.z + Math.cos(a) * d;
        const floor = g.level.collision.groundHeight(x, z, Math.min(p.y, 1) + 0.4);
        if (!g.level.collision.clear(x, z, floor, 0.3, 1.7)) continue;
        g.player.teleport([x, floor + 0.2, z], a + Math.PI);
        const focus = g.interaction.update(g.player.position, g.player.yaw);
        if (focus?.def.kind === "visit" && focus.def.refId === key) return true;
      }
    return false;
  }, key);
  expect(ok).toBe(true);
  await page.waitForTimeout(200);
  await expect(page.getByTestId("prompt")).toContainText(label);
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(250);
}

test("home stage: wake before five, pack the bag, read the calendar, matching pattu", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startVisit(page);
  let v = await visit(page);
  expect(v.stage).toBe("home");
  await page.screenshot({ path: "test-results/screens/50-visit-home.png" });
  // the mom is the player now
  expect(await page.evaluate(() => window.__tom!.game.player.model.children.length > 0)).toBe(true);

  await useStation(page, "cot", /Wake up/);
  v = await visit(page);
  expect(await done(page)).toContain("wake_early");

  await useStation(page, "bag", /Pack the temple bag/);
  await page.getByTestId("minigame-bag").waitFor();
  for (const id of ["flowers", "coconut", "kumkum", "pins", "spare_chappals"]) await page.getByTestId(`bag-${id}`).click();
  await page.screenshot({ path: "test-results/screens/51-bag-minigame.png" });
  await page.getByTestId("bag-done").click();
  expect(await done(page)).toContain("pack_bag");

  await useStation(page, "calendar", /calendar/);
  await page.getByTestId("calendar-card").waitFor();
  // the card shows only briefly (memory test); the answer the game will check:
  const tithi = await page.evaluate(() => (window.__tom!.game.visit as unknown as { tithi: string }).tithi);
  await page.waitForTimeout(1800);
  const opts = page.locator("[data-testid^=mini-option-]");
  const n = await opts.count();
  for (let i = 0; i < n; i++)
    if ((await opts.nth(i).textContent())!.includes(tithi)) {
      await opts.nth(i).click(); // the mini-game closes on the answer
      break;
    }
  expect(await done(page)).toContain("remember_tithi");

  await useStation(page, "husband", /matching pattu/);
  await page.getByTestId("mini-option-0").click();
  expect(await done(page)).toContain("family_pattu");
  v = await visit(page);
  expect(v.punya).toBeGreaterThan(50);
  expect(v.blessings).toBeGreaterThan(0);
  expect(log.errors).toEqual([]);
});

/** Read a private field of the running visit director (tests only). */
const priv = <T>(page: Page, key: string) => page.evaluate((k) => (window.__tom!.game.visit as unknown as Record<string, unknown>)[k], key) as Promise<T>;

test("full visit: drive and park, chappals, the queue runner, rituals, darshan, exit, score and profile", async ({ page }) => {
  test.setTimeout(300_000);
  const log = watchConsole(page);
  await waitForTitle(page);
  await startVisit(page);
  // home, quickly: pack the bag with the coconut
  await useStation(page, "bag", /Pack the temple bag/);
  for (const id of ["flowers", "coconut", "kumkum", "pins", "spare_chappals"]) await page.getByTestId(`bag-${id}`).click();
  await page.getByTestId("bag-done").click();

  // arrival: the auto drives (W), then we park it near the gate and get out
  await useStation(page, "auto", /Get in the auto/);
  expect((await visit(page)).driving).toBe(true);
  await hold(page, ["KeyW"], 1500);
  const driven = await page.evaluate(() => (window.__tom!.game.visit as unknown as { auto: { stats: { distance: number } } }).auto.stats.distance);
  expect(driven).toBeGreaterThan(2);
  await page.screenshot({ path: "test-results/screens/52-driving.png" });
  await page.evaluate(() => {
    const a = (window.__tom!.game.visit as unknown as { auto: { position: { set: (x: number, y: number, z: number) => void }; speed: number; yaw: number } }).auto;
    a.position.set(4, 0, 68);
    a.speed = 0;
    a.yaw = Math.PI;
  });
  await page.waitForTimeout(200);
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(300);
  expect((await visit(page)).driving).toBe(false);
  expect(await done(page)).toContain("parking_close");

  // the gate rule: chappals still on -> pushed back out
  await page.evaluate(() => window.__tom!.game.player.teleport([0, 0.5, 46], Math.PI));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__tom!.game.player.position.z)).toBeGreaterThan(48.4);
  await useStation(page, "stand", /chappal/i);
  expect(await done(page)).toContain("chappals_stand");

  // the queue: join the fastest lane and run it
  const speeds = await page.evaluate(() => (window.__tom!.game.visit as unknown as { crowd: Array<{ speed: number }> }).crowd.map((l) => l.speed));
  const fastest = speeds.indexOf(Math.max(...speeds));
  await useStation(page, `lane_${fastest}`, /Join the/);
  await page.getByTestId("queue-panel").waitFor();
  await page.screenshot({ path: "test-results/screens/53-queue.png" });
  await page.keyboard.down("KeyW");
  for (let i = 0; i < 160 && (await visit(page)).queue; i++) {
    if (await page.getByTestId("minigame-choice").isVisible().catch(() => false)) await page.getByTestId("mini-option-0").click();
    const q = await priv<{ event: string | null } | null>(page, "q");
    if (q?.event) await page.keyboard.press("KeyE");
    await page.waitForTimeout(250);
  }
  await page.keyboard.up("KeyW");
  const afterQueue = await done(page);
  expect((await visit(page)).queue).toBeNull();
  expect(afterQueue).toContain("right_queue");
  expect(afterQueue).toContain("cutter_calm");
  expect(afterQueue.some((x) => x === "relative_merge" || x === "prasadam_shortcut")).toBe(true);

  // rituals: coconut timing bar
  await useStation(page, "coconut", /Break the coconut/);
  await page.getByTestId("minigame-coconut").waitFor();
  for (let i = 0; i < 400; i++) {
    const x = await page.locator(".timing-bar .marker").evaluate((e) => parseFloat((e as HTMLElement).style.left));
    if (Math.abs(x - 50) < 4) {
      await page.keyboard.press("Space");
      break;
    }
    await page.waitForTimeout(8);
  }
  await page.waitForTimeout(200);
  expect((await done(page)).some((x) => x === "coconut_clean" || x === "coconut_rolled")).toBe(true);
  // lamps: light exactly as many as wishes
  await useStation(page, "lamps", /Light lamps/);
  const wishes = await priv<number>(page, "wishes");
  for (let i = 0; i < 9; i++) {
    const lit = Number(await page.getByTestId("lamps-lit").textContent());
    if (lit >= wishes) break;
    await page.getByTestId(`lamp-${i}`).click();
    if (Number(await page.getByTestId("lamps-lit").textContent()) === lit) await page.getByTestId(`lamp-${i}`).click();
  }
  await page.getByTestId("lamps-done").click();
  // pradakshina: walk one clockwise circuit around the sanctum
  const ring = await page.evaluate(() => (window.__tom!.game.visit as unknown as { layout: { pradakshina: { center: [number, number]; rx: number; rz: number } } }).layout.pradakshina);
  for (let k = 0; k <= 26; k++) {
    const a = (k / 24) * Math.PI * 2;
    await page.evaluate(([x, z]) => window.__tom!.game.player.teleport([x!, 0.5, z!], 0), [ring.center[0] + Math.cos(a) * ring.rx, ring.center[1] + Math.sin(a) * ring.rz]);
    await page.waitForTimeout(60);
  }
  expect((await visit(page)).pradakshina).toBeGreaterThanOrEqual(1);
  // priest: sloka and archana
  await useStation(page, "priest", /sloka/);
  const right = await page.evaluate(() => (window.__tom!.game.ui.get().visit!.mini!.data as { right: string }).right);
  const so = page.locator("[data-testid^=mini-option-]");
  for (let i = 0; i < (await so.count()); i++)
    if ((await so.nth(i).textContent())!.includes(right)) {
      await so.nth(i).click();
      break;
    }
  expect(await done(page)).toContain("sloka_right");
  await useStation(page, "priest", /Archana/);
  const nak = await priv<string>(page, "nakshatra");
  const got = await priv<string>(page, "gotra");
  for (const want of [nak, got]) {
    const o = page.locator("[data-testid^=mini-option-]");
    for (let i = 0; i < (await o.count()); i++)
      if ((await o.nth(i).textContent())!.includes(want)) {
        await o.nth(i).click();
        break;
      }
    await page.waitForTimeout(100);
  }
  expect(await done(page)).toContain("archana");

  // darshan: hold Space, steer against the crowd with A/D
  await useStation(page, "darshan", /darshan/);
  await page.getByTestId("minigame-darshan").waitFor();
  await page.keyboard.down("Space");
  for (let i = 0; i < 160 && (await page.getByTestId("minigame-darshan").isVisible().catch(() => false)); i++) {
    const left = await page.locator(".darshan-view .deity").evaluate((e) => parseFloat((e as HTMLElement).style.left)).catch(() => 50);
    const key = left > 52 ? "KeyA" : left < 48 ? "KeyD" : null;
    if (key) {
      await page.keyboard.down(key);
      await page.waitForTimeout(40);
      await page.keyboard.up(key);
    } else await page.waitForTimeout(40);
  }
  await page.keyboard.up("Space");
  expect(await done(page)).toContain("darshan_full");
  await useStation(page, "darshan", /Pray/);
  const needed = await page.evaluate(() => (window.__tom!.game.ui.get().visit!.mini!.data as { needed: string[] }).needed);
  for (const n of needed) await page.getByTestId(`pray-${n}`).check();
  await page.getByTestId("pray-done").click();
  expect(await done(page)).toContain("pray_family");
  await page.screenshot({ path: "test-results/screens/54-after-darshan.png" });

  // exit: chappals back from the stand, prasadam, photo, then home
  await useStation(page, "stand", /collect your chappals/);
  if (await page.getByTestId("minigame-choice").isVisible().catch(() => false)) await page.getByTestId("mini-option-0").click();
  await useStation(page, "prasadam", /prasadam/);
  expect(await done(page)).toContain("prasadam_neighbours");
  await useStation(page, "photo", /photo/);
  await page.getByTestId("minigame-photo").waitFor();
  for (let i = 0; i < 300; i++) {
    const open = await page.locator("[data-testid^=face-]").evaluateAll((els) => els.every((e) => e.getAttribute("data-open") === "true"));
    if (open) {
      await page.getByTestId("photo-snap").click();
      break;
    }
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(200);
  await useStation(page, "auto", /Head home/);
  await page.getByTestId("visit-score").waitFor();
  await page.screenshot({ path: "test-results/screens/55-score.png" });
  const total = Number(await page.getByTestId("final-score").textContent());
  expect(total).toBeGreaterThan(200);
  const prof = await page.evaluate(() => window.__tom!.saves.loadVisitProfile());
  expect(prof.personalBest.city).toBe(total);
  expect(prof.kumkum).toBeGreaterThan(0);
  // back to the title restores story mode
  await page.getByTestId("visit-title").click();
  await page.getByTestId("title").waitFor();
  expect(await page.evaluate(() => window.__tom!.game.visit)).toBeNull();
  expect(log.errors).toEqual([]);
});

test("hill temple: climbing the stone steps is its own stage; neighbourhood shrine has its stations", async ({ page }) => {
  test.setTimeout(180_000);
  const log = watchConsole(page);
  await waitForTitle(page);
  await page.evaluate(() => window.__tom!.game.startVisit("devotional", "hill"));
  await page.getByTestId("visit-hud").waitFor();
  const foot = await page.evaluate(() => {
    const v = window.__tom!.game.visit as unknown as { world: { sockets: Map<string, { x: number; y: number; z: number }> }; chappalsOff: boolean };
    v.chappalsOff = true; // chappals handled (covered in the full visit test)
    const f = v.world.sockets.get("hill.SOCKET_StairFoot")!;
    const t = v.world.sockets.get("hill.SOCKET_StairTop")!;
    return { f, t };
  });
  // walk up the stair: face the top and hold W
  await page.evaluate(({ f, t }) => {
    const g = window.__tom!.game;
    g.player.teleport([f.x, 0.3, f.z], Math.atan2(t.x - f.x, t.z - f.z));
    g.cam.yaw = Math.atan2(t.x - f.x, t.z - f.z) + Math.PI;
  }, foot);
  await page.waitForTimeout(300);
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyW");
  for (let i = 0; i < 40 && !(await done(page)).includes("steps_climbed"); i++) await page.waitForTimeout(250);
  await page.keyboard.up("KeyW");
  await page.keyboard.up("ShiftLeft");
  const y = await page.evaluate(() => window.__tom!.game.player.position.y);
  await page.screenshot({ path: "test-results/screens/56-hill-top.png" });
  expect(await done(page)).toContain("steps_climbed");
  expect(y).toBeGreaterThan(5.5);
  const v = await visit(page);
  expect(v.stress).toBeGreaterThan(0); // the climb is tiring
  expect(v.blessings).toBeGreaterThan(0);

  // neighbourhood temple: its stand and queue are reachable
  await page.evaluate(() => window.__tom!.game.startVisit("devotional", "neighbourhood"));
  await page.getByTestId("visit-hud").waitFor();
  await useStation(page, "stand", /chappal/i);
  expect(await done(page)).toContain("chappals_stand");
  await useStation(page, "lane_0", /Join the FREE queue/);
  await page.getByTestId("queue-panel").waitFor();
  expect((await visit(page)).queue?.lane).toBe(0);
  await page.screenshot({ path: "test-results/screens/57-neighbourhood.png" });
  expect(log.errors).toEqual([]);
});

test("stress at 100 ends the run early with the 'lost it' screen; Esc out of a mini-game counts as a fail", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await page.evaluate(() => window.__tom!.game.startVisit("hustle", "city"));
  await page.getByTestId("visit-hud").waitFor();
  // Esc out of the bag mini-game
  await useStation(page, "bag", /Pack the temple bag/);
  await page.getByTestId("minigame-bag").waitFor();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("minigame-bag")).toHaveCount(0);
  expect(await done(page)).not.toContain("pack_bag");
  // bad falls pile up Stress through the real landing hook until amma loses it
  for (let i = 0; i < 8; i++) await page.evaluate(() => window.__tom!.game.landListeners.forEach((l) => l("injury", 4)));
  await page.getByTestId("visit-score").waitFor();
  await expect(page.getByTestId("visit-score")).toContainText("lost it");
  const s = await visit(page);
  expect(s.stress).toBe(100);
  await page.screenshot({ path: "test-results/screens/58-lost-it.png" });
  await page.getByTestId("visit-title").click();
  await page.getByTestId("title").waitFor();
  expect(log.errors).toEqual([]);
});
