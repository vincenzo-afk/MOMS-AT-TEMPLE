import { test, expect, type Page } from "@playwright/test";
import { waitForTitle, watchConsole } from "./helpers";

// The Temple Visit actions the full-visit test does not reach: the chappal-bush memory test (wrong bush, right
// bush, right spot), vibhuti for the whole family against the clock, Lakshmi-aunty's gossip and the annadanam.
test.describe.configure({ mode: "serial" });

type Vis = Record<string, unknown> & { run: { done: string[]; stress: number; chappals: { method: string | null; spot: number | null } }; flags: Set<string> };
const done = (page: Page) => page.evaluate(() => [...(window.__tom!.game.visit?.run.done ?? [])]);
const stress = (page: Page) => page.evaluate(() => (window.__tom!.game.visit as unknown as Vis).run.stress);

async function startVisit(page: Page) {
  await page.evaluate(() => {
    const t = window.__tom!;
    t.game.settings = { ...t.game.settings, showIntro: false, typewriter: false };
  });
  await page.getByTestId("temple-visit").click();
  await page.getByTestId("visit-menu").waitFor();
  await page.getByTestId("mom-devotional").click();
  await page.getByTestId("temple-city").click();
  await page.getByTestId("start-visit").click();
  await page.getByTestId("visit-hud").waitFor();
}

/** Stand where the interaction system offers this station (by refId), then press E. */
async function useStation(page: Page, key: string, label: RegExp) {
  const ok = await page.evaluate((key) => {
    const g = window.__tom!.game;
    type Src = { def: { refId: string; kind: string }; position: () => { x: number; y: number; z: number } };
    const src = (g.interaction as unknown as { sources: Src[] }).sources.find((s) => s.def.kind === "visit" && s.def.refId === key)!;
    const p = src.position();
    for (const d of [0.9, 1.3, 0.6, 1.8])
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
  expect(ok, `station ${key}`).toBe(true);
  await page.waitForTimeout(200);
  await expect(page.getByTestId("prompt")).toContainText(label);
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(250);
}

/** Skip the queue: the visit continues as if the family had reached the front. */
const skipQueue = (page: Page) =>
  page.evaluate(() => {
    const v = window.__tom!.game.visit as unknown as Vis & { refresh: () => void };
    v.queueDone = true;
    v.enteredTemple = true;
    v.refresh();
  });

test("chappals in a secret bush: the wrong bush costs Stress, the right bush and spot gets them back", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startVisit(page);
  await useStation(page, "bush2", /Hide your chappals/);
  await page.getByTestId("mini-option-2").click(); // "By the red flowers"
  expect(await done(page)).toContain("chappals_bush");
  expect(await page.evaluate(() => (window.__tom!.game.visit as unknown as Vis).run.chappals)).toEqual({ method: "bush", spot: 2 });

  await skipQueue(page);
  const s0 = await stress(page);
  await useStation(page, "bush1", /Look for your chappals here/);
  expect(await stress(page)).toBeGreaterThanOrEqual(s0 + 4);
  // the right bush, the wrong spot first (Stress +6), then the right one
  await useStation(page, "bush2", /Look for your chappals here/);
  const s1 = await stress(page);
  await page.getByTestId("mini-option-0").click();
  expect(await stress(page)).toBeGreaterThanOrEqual(s1 + 6);
  await useStation(page, "bush2", /Look for your chappals here/);
  await page.getByTestId("mini-option-2").click();
  // the bush has a small theft risk: a missing pair asks what to do
  if (await page.getByTestId("minigame-choice").isVisible().catch(() => false)) await page.getByTestId("mini-option-1").click();
  expect(await page.evaluate(() => (window.__tom!.game.visit as unknown as { chappalsBack: boolean }).chappalsBack)).toBe(true);
  const d = await done(page);
  expect(d.some((x) => x === "chappals_found" || x === "chappals_missing" || x === "chappals_better")).toBe(true);
  expect(log.errors).toEqual([]);
});

test("vibhuti for the whole family in ten seconds; gossip with Lakshmi-aunty; annadanam for the kids", async ({ page }) => {
  test.setTimeout(180_000);
  const log = watchConsole(page);
  await waitForTitle(page);
  await startVisit(page);
  await useStation(page, "stand", /chappal/i);
  await skipQueue(page);

  // the priest offers vibhuti once the sloka and archana are done
  await page.evaluate(() => {
    const v = window.__tom!.game.visit as unknown as Vis & { refresh: () => void };
    v.flags.add("sloka_tried");
    v.flags.add("archana_tried");
    v.refresh();
  });
  await useStation(page, "priest", /Vibhuti for the whole family/);
  // the family gathers round (stand them beside the player), then a pinch for each
  await page.evaluate(() => {
    const g = window.__tom!.game;
    const fam = (g.visit as unknown as { family: { members: Array<{ position: { set: (x: number, y: number, z: number) => void } }> } }).family.members;
    const p = g.player.position;
    fam.forEach((m, i) => m.position.set(p.x + 1.4 * Math.cos(i * 2.1), p.y, p.z + 1.4 * Math.sin(i * 2.1)));
  });
  for (const [id, name] of [["husband", "Ravi"], ["son", "Karthik"], ["daughter", "Priya"]] as const) await useStation(page, id, new RegExp(`Vibhuti for ${name}`));
  expect(await done(page)).toContain("vibhuti_family");

  // gossip: the interested answer every round
  await useStation(page, "gossip", /Lakshmi-aunty/);
  const good = ["Which college? Tell me everything.", "Two months?! Poor Saroja.", "Same time, same temple. Promise!"];
  for (const g of good) {
    const opts = page.locator("[data-testid^=mini-option-]");
    await opts.first().waitFor();
    for (let i = 0; i < (await opts.count()); i++)
      if ((await opts.nth(i).textContent())!.includes(g)) {
        await opts.nth(i).click();
        break;
      }
    await page.waitForTimeout(120);
  }
  expect(await done(page)).toContain("gossip");

  // annadanam: the kids sit at the mats and finish every grain
  await useStation(page, "annadanam", /annadanam/);
  await page.waitForTimeout(2900);
  const kidPose = await page.evaluate(() => {
    const fam = (window.__tom!.game.visit as unknown as { family: { members: Array<{ id: string; pose: string | null }>; detached: Set<string> } }).family;
    return { detached: [...fam.detached].sort() };
  });
  expect(kidPose.detached).toEqual(["daughter", "son"]);
  await page.waitForTimeout(5600);
  expect(await done(page)).toContain("annadanam");
  await page.screenshot({ path: "test-results/screens/56-annadanam.png" });
  expect(log.errors).toEqual([]);
});

test("the drive to the temple is guided: a beacon over the gate, an arrow and the distance, gone once parked", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startVisit(page);
  await useStation(page, "auto", /Get in the auto/);
  await expect(page.getByTestId("drive-guide")).toBeVisible();
  const g0 = await page.evaluate(() => {
    const g = window.__tom!.game;
    const a = (g.visit as unknown as { auto: { position: { x: number; z: number } } }).auto.position;
    return { ui: g.ui.get().visit!.guide!, auto: [a.x, a.z], beacon: g.scene.getObjectByName("VisitBeacon")!.visible };
  });
  expect(g0.beacon).toBe(true);
  expect(Math.abs(g0.ui.distance - Math.hypot(0 - g0.auto[0]!, 50 - g0.auto[1]!))).toBeLessThan(2); // city gate at (0, 50)
  await page.screenshot({ path: "test-results/screens/57-drive-guide.png" });
  // park outside the gate and get out: guidance ends
  await page.evaluate(() => {
    const a = (window.__tom!.game.visit as unknown as { auto: { position: { set: (x: number, y: number, z: number) => void }; speed: number; yaw: number } }).auto;
    a.position.set(4, 0, 68);
    a.speed = 0;
    a.yaw = Math.PI;
  });
  await page.waitForTimeout(400);
  await expect(page.getByTestId("drive-distance")).toHaveText("18");
  await expect(page.getByTestId("drive-guide")).toContainText("park here");
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(500);
  await expect(page.getByTestId("drive-guide")).toHaveCount(0);
  expect(await page.evaluate(() => window.__tom!.game.scene.getObjectByName("VisitBeacon")!.visible)).toBe(false);
  expect(log.errors).toEqual([]);
});
