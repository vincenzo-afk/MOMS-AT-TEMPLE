import { test, expect } from "@playwright/test";
import { startNewGame, teleport, waitForTitle, watchConsole } from "./helpers";

test.describe.configure({ mode: "serial" });

const setHour = (page: import("@playwright/test").Page, h: number) =>
  page.evaluate((hour) => {
    const t = window.__tom!;
    t.session.state.worldMinutes = Math.floor(t.session.state.worldMinutes / 1440) * 1440 + hour * 60;
    t.game.npcs.snapToSchedule();
    t.game.updateMusic();
  }, h);

test("music follows the hour and the place; the placeholder score plays; stings on restoration", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  expect(await page.evaluate(() => window.__tom!.game.audio.started)).toBe(true);

  await setHour(page, 6.5);
  expect(await page.evaluate(() => window.__tom!.game.audio.musicCue)).toBe("mus_morning");
  // no file is supplied, so the synthesized score carries the cue: drone plucks and phrases get scheduled
  const before = await page.evaluate(() => ({ ...window.__tom!.game.audio.synth!.counts }));
  await page.waitForTimeout(5000);
  const after = await page.evaluate(() => ({ playing: window.__tom!.game.audio.synth!.playing, ...window.__tom!.game.audio.synth!.counts }));
  expect(after.playing).toBe("mus_morning");
  expect(after.plucks - before.plucks).toBeGreaterThanOrEqual(3);
  expect(after.notes).toBeGreaterThan(before.notes);

  await setHour(page, 18.5);
  expect(await page.evaluate(() => window.__tom!.game.audio.synth!.playing)).toBe("mus_evening");
  await setHour(page, 23);
  expect(await page.evaluate(() => window.__tom!.game.audio.musicCue)).toBeNull();

  // festival evenings
  await page.evaluate(() => {
    window.__tom!.session.state.flags.festival_held = true;
  });
  await setHour(page, 19);
  expect(await page.evaluate(() => window.__tom!.game.audio.musicCue)).toBe("mus_festival");
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__tom!.game.audio.synth!.counts.drums)).toBeGreaterThan(0);

  // a restoration plays its sting over the bed
  const stings = await page.evaluate(() => {
    const a = window.__tom!.game.audio;
    a.play("mus_restoration");
    return a.synth!.counts.stings;
  });
  expect(stings).toBe(1);
  expect(log.errors).toEqual([]);
});

test("the workshop: its own music by day and Velan's chisel heard from the bench (positional)", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await setHour(page, 11);
  await teleport(page, 23, 12, Math.PI / 2);
  await page.evaluate(() => window.__tom!.game.updateMusic());
  expect(await page.evaluate(() => window.__tom!.game.audio.musicCue)).toBe("mus_workshop");

  const taps0 = await page.evaluate(() => window.__tom!.game.audio.soundscape!.counts.taps);
  await page.waitForTimeout(5000);
  const r = await page.evaluate(() => {
    const g = window.__tom!.game;
    const l = (g.audio as unknown as { ctx: AudioContext }).ctx.listener;
    return { taps: g.audio.soundscape!.counts.taps, lx: l.positionX.value, lz: l.positionZ.value, cx: g.camera.position.x, cz: g.camera.position.z };
  });
  expect(r.taps).toBeGreaterThan(taps0);
  // the listener rides with the camera
  expect(Math.abs(r.lx - r.cx)).toBeLessThan(0.5);
  expect(Math.abs(r.lz - r.cz)).toBeLessThan(0.5);

  // at night the bench is quiet
  await setHour(page, 22);
  await page.waitForTimeout(400);
  const n0 = await page.evaluate(() => window.__tom!.game.audio.soundscape!.counts.taps);
  await page.waitForTimeout(4000);
  expect(await page.evaluate(() => window.__tom!.game.audio.soundscape!.counts.taps)).toBe(n0);
  expect(log.errors).toEqual([]);
});
