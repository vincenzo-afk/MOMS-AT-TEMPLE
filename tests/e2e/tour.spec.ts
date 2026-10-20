import { test } from "@playwright/test";
import { startNewGame, waitForTitle } from "./helpers";

// Visual review tour: screenshots of every area and the new panels (not an assertion test).
test("tour: new areas and panels", async ({ page }) => {
  test.setTimeout(240_000);
  await waitForTitle(page);
  await startNewGame(page);
  await page.evaluate(() => {
    const t = window.__tom!;
    t.session.state.worldMinutes = 9.5 * 60;
    t.game.npcs.snapToSchedule();
  });
  const shots: Array<[string, [number, number, number], number, number]> = [
    ["30-approach-kulam", [-18, 0, 74], 1.4, 0.32],
    ["31-bazaar", [74, 0, 10], -1.4, 0.18],
    ["32-well-square", [82, 0, 13], 3.0, 0.22],
    ["33-east-lane", [80, 0, 36], 2.9, 0.2],
    ["34-fields-dry", [78, 0, -56], 0.15, 0.32],
    ["35-reservoir-sluice", [84, 0, -108], 0.2, 0.3],
    ["36-ruins-gate", [-46, 0, -26], 1.57, 0.2],
    ["37-ruins-wall-pillar", [-71, 0, -31], 0.25, 0.28],
    ["38-pavilion-path", [-76, 0, -22], 1.5, 0.25],
    ["39-woods", [-76, 0, -62], 0.6, 0.25],
    ["40-home", [-17, 0, 28], 1.5, 0.2],
    ["41-field-hut-plots", [40, 0, -70], 3.1, 0.45],
  ];
  for (const [name, pos, yaw, pitch] of shots) {
    await page.evaluate(
      ([pos, yaw, pitch]) => {
        const g = window.__tom!.game;
        g.player.teleport(pos as [number, number, number], (yaw as number) + Math.PI);
        g.cam.yaw = yaw as number;
        g.cam.pitch = pitch as number;
        g.cam.distance = 7;
      },
      [pos, yaw, pitch] as const,
    );
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `test-results/screens/${name}.png` });
  }
  // restored states + festival evening
  await page.evaluate(() => {
    const t = window.__tom!;
    const s = t.session.state;
    s.restorations = { ...s.restorations, rest_channel_east: "flowing", rest_garden_main: "recovering", rest_well: "working", rest_sluice: "open", rest_fields: "irrigated", rest_ruin_wall: "repaired", rest_ruin_pillar: "standing", rest_old_path: "cleared", rest_weaver_house: "restored" };
    s.flags = { ...s.flags, festival_held: true, weaver_returned: true, gate_garland_hung: true, fields_irrigated: true };
    s.decor = { decor_doorway: "flower_garland", decor_doorstep: "kolam_powder", decor_lamp: "oil_lamp", decor_mat: "woven_mat", decor_plant: "tulsi_pot" };
    s.plots = { plot_1: { stage: "ripe", seedItemId: "seed_packet", plantedAt: 0, wateredAt: 0 }, plot_2: { stage: "growing", seedItemId: "seed_packet", plantedAt: 0, wateredAt: 0 }, plot_3: { stage: "planted", seedItemId: "seed_packet", plantedAt: 0, wateredAt: null }, plot_4: { stage: "empty", seedItemId: null, plantedAt: 0, wateredAt: null } };
    t.session.replaceState({ ...s });
    t.game.worldView.apply();
  });
  const after: Array<[string, [number, number, number], number, number]> = [
    ["50-fields-irrigated", [78, 0, -56], 0.15, 0.32],
    ["51-ruins-restored", [-71, 0, -31], 0.25, 0.28],
    ["52-weaver-restored", [80, 0, 36], 2.9, 0.2],
    ["53-home-decorated", [-17, 0, 28], 1.5, 0.2],
    ["54-plots-stages", [40, 0, -70], 3.1, 0.45],
  ];
  for (const [name, pos, yaw, pitch] of after) {
    await page.evaluate(
      ([pos, yaw, pitch]) => {
        const g = window.__tom!.game;
        g.player.teleport(pos as [number, number, number], (yaw as number) + Math.PI);
        g.cam.yaw = yaw as number;
        g.cam.pitch = pitch as number;
        g.cam.distance = 7;
      },
      [pos, yaw, pitch] as const,
    );
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `test-results/screens/${name}.png` });
  }
  await page.evaluate(() => {
    const t = window.__tom!;
    t.session.state.worldMinutes = 19.5 * 60;
    t.game.npcs.snapToSchedule();
    t.game.player.teleport([0, 0, 22], Math.PI);
    t.game.cam.yaw = 0;
    t.game.cam.pitch = 0.35;
    t.game.cam.distance = 9;
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/screens/55-festival-evening.png" });
  await page.evaluate(() => window.__tom!.game.openPanel("map"));
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/screens/56-map.png" });
  await page.evaluate(() => window.__tom!.game.closePanel());
  await page.evaluate(() => window.__tom!.game.openPanel("community"));
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/screens/57-community.png" });
});
