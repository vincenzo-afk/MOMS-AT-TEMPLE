import { test, expect, type Page } from "@playwright/test";
import { findOpenGround, hold, pressE, startNewGame, teleport, waitForTitle, watchConsole } from "./helpers";

test.describe.configure({ mode: "serial" });

/** Start sampling per-frame body data in the page (hips position, clip weight sum, bone rotations). */
async function startSampler(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __samples: Array<Record<string, number>>; __sampling: boolean };
    w.__samples = [];
    w.__sampling = true;
    const g = window.__tom!.game;
    const rig = g.player.rig!;
    const p = g.player.position.clone();
    const fl = g.player.position.clone();
    const fr = g.player.position.clone();
    const tick = () => {
      if (!w.__sampling) return;
      rig.hips.getWorldPosition(p);
      rig.foot[0].getWorldPosition(fl);
      rig.foot[1].getWorldPosition(fr);
      w.__samples.push({ t: performance.now(), hx: p.x, hy: p.y, hz: p.z, w: g.player.animator.totalWeight(), lx: fl.x, ly: fl.y, lz: fl.z, rx: fr.x, ry: fr.y, rz: fr.z, py: g.player.position.y, px: g.player.position.x, pz: g.player.position.z, lean: g.player.leanAngle });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
async function stopSampler(page: Page): Promise<Array<Record<string, number>>> {
  return page.evaluate(() => {
    const w = window as unknown as { __samples: Array<Record<string, number>>; __sampling: boolean };
    w.__sampling = false;
    return w.__samples;
  });
}
const maxStep = (s: Array<Record<string, number>>, k: (x: Record<string, number>) => [number, number, number]) => {
  let m = 0;
  for (let i = 1; i < s.length; i++) {
    const a = k(s[i - 1]!);
    const b = k(s[i]!);
    m = Math.max(m, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  }
  return m;
};

test("bench: the pelvis rests on the measured seat, feet on the floor, back on the backrest; smooth sit and stand; 360 orbit", async ({ page }) => {
  test.setTimeout(150_000);
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await page.evaluate(() => (window.__tom!.session.state.worldMinutes = 10 * 60));
  await teleport(page, -10.9, 32, -Math.PI / 2); // facing the backrest bench across the courtyard
  await expect(page.getByTestId("prompt")).toContainText("bench");
  await startSampler(page);
  await pressE(page);
  await expect.poll(() => page.evaluate(() => window.__tom!.game.seatSession?.seated ?? false), { timeout: 15_000 }).toBe(true);
  await page.waitForTimeout(800);
  const sit = await stopSampler(page);

  const m = await page.evaluate(() => {
    const g = window.__tom!.game;
    const seat = g.seatSession!.seat;
    const rig = g.player.rig!;
    const hips = rig.hips.getWorldPosition(g.player.position.clone());
    const feet = rig.foot.map((f) => f.getWorldPosition(g.player.position.clone()));
    const chest = rig.chest.getWorldPosition(g.player.position.clone());
    const back = chest.clone().set(-Math.sin(seat.yaw), 0, -Math.cos(seat.yaw));
    // a point on the surface of the back, behind the chest bone
    const backSurface = chest.clone().addScaledVector(back, 0.1);
    const c = g.level.collision;
    return {
      seatTop: seat.seatTop,
      backrest: seat.backrest,
      error: g.seatSession!.lastError,
      hipsAboveSeat: hips.y - seat.seatTop,
      feetAboveFloor: feet.map((f) => f.y - seat.floorY),
      ankle: rig.ankleHeight,
      backInsideBackrest: c.inside(backSurface.x, backSurface.y, backSurface.z, 0),
      chestInside: c.inside(chest.x, chest.y, chest.z, 0),
      hipsInside: c.inside(hips.x, hips.y + 0.05, hips.z, 0),
    };
  });
  console.log("SEAT", JSON.stringify(m));
  expect(m.seatTop).toBeGreaterThan(0.4);
  expect(m.seatTop).toBeLessThan(0.5);
  expect(m.backrest).toBe(true);
  expect(m.error).toBeLessThan(0.02); // pelvis on the measured seat point
  expect(m.hipsAboveSeat).toBeGreaterThan(0.09);
  expect(m.hipsAboveSeat).toBeLessThan(0.15);
  for (const f of m.feetAboveFloor) expect(Math.abs(f - m.ankle)).toBeLessThan(0.05); // feet flat on the floor
  expect(m.backInsideBackrest).toBe(false);
  expect(m.chestInside).toBe(false);
  expect(m.hipsInside).toBe(false);
  // no pop: the pelvis moves continuously through the sit-down, and clip weights always sum to 1 (no T-pose)
  expect(maxStep(sit, (s) => [s.hx!, s.hy!, s.hz!])).toBeLessThan(0.09);
  expect(Math.min(...sit.map((s) => s.w!))).toBeGreaterThan(0.98);

  // orbit the camera 360 degrees around the seated character
  for (let i = 0; i < 8; i++) {
    await page.evaluate((a) => {
      const g = window.__tom!.game;
      g.cam.yaw = a;
      g.cam.pitch = 0.25;
    }, -Math.PI / 2 + (i * Math.PI) / 4);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `test-results/screens/40-seated-orbit-${i}.png` });
  }

  // stand up with a movement key: smooth, then free to walk
  await startSampler(page);
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(150);
  await page.keyboard.up("KeyW");
  await expect.poll(() => page.evaluate(() => window.__tom!.game.seatSession === null), { timeout: 10_000 }).toBe(true);
  const stand = await stopSampler(page);
  expect(maxStep(stand, (s) => [s.hx!, s.hy!, s.hz!])).toBeLessThan(0.09);
  expect(Math.min(...stand.map((s) => s.w!))).toBeGreaterThan(0.98);
  await hold(page, ["KeyW"], 600);
  expect(await page.evaluate(() => window.__tom!.game.player.locked)).toBe(false);
  expect(log.errors).toEqual([]);
});

test("jump off the plinth: weighty arc, hard landing with recovery; flat-ground jump height; coyote and buffer", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  // flat-ground jump: peak about 0.6 m, about half a second in the air
  const [ox, oz] = await findOpenGround(page, 2.5);
  await teleport(page, ox, oz, 0);
  await page.waitForTimeout(300);
  await startSampler(page);
  await page.keyboard.press("Space");
  await page.waitForTimeout(1100);
  let s = await stopSampler(page);
  const base = s[0]!.py!;
  const peak = Math.max(...s.map((x) => x.py!)) - base;
  const air = s.filter((x) => x.py! > base + 0.01);
  const airTime = (air[air.length - 1]!.t! - air[0]!.t!) / 1000;
  console.log("JUMP", JSON.stringify({ peak, airTime }));
  expect(peak).toBeGreaterThan(0.5);
  expect(peak).toBeLessThan(0.7);
  expect(airTime).toBeGreaterThan(0.35); // not a twitch
  expect(airTime).toBeLessThan(0.65); // not a moon jump

  // ledge: stand on the temple plinth (1.5 m), run off the edge with a jump
  // a clear spot on the plinth's east strip (the temple walls stand further in)
  const spot = await page.evaluate(() => {
    const g = window.__tom!.game;
    for (let z = -22; z <= -7; z += 0.5) if (g.level.collision.clear(6.4, z, 1.5, 0.35, 1.7)) return z;
    return null;
  });
  expect(spot).not.toBeNull();
  await page.evaluate((z) => window.__tom!.game.player.teleport([6.4, 1.6, z!], Math.PI / 2), spot);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__tom!.game.player.position.y)).toBeCloseTo(1.5, 1);
  await page.evaluate(() => (window.__tom!.game.cam.yaw = -Math.PI / 2)); // W heads +x, off the east edge
  await startSampler(page);
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(250);
  await page.keyboard.press("Space");
  await page.waitForTimeout(700);
  await page.keyboard.up("KeyW");
  await page.waitForTimeout(900);
  s = await stopSampler(page);
  await page.screenshot({ path: "test-results/screens/41-after-ledge.png" });
  const land = await page.evaluate(() => window.__tom!.game.player.stats.lastLand);
  console.log("LEDGE", JSON.stringify({ land, minY: Math.min(...s.map((x) => x.py!)) }));
  expect(land?.kind).toBe("hard");
  expect(land!.height).toBeGreaterThan(1.7);
  // weighty, not floaty: time from the peak to touchdown matches gravity's prediction (sqrt(2h / g_fall))
  const peakY = Math.max(...s.map((x) => x.py!));
  const peakT = s.find((x) => x.py === peakY)!.t!;
  const downT = s.find((x) => x.t! > peakT && x.py! <= 0.01)!.t!;
  const fallTime = (downT - peakT) / 1000;
  const predicted = Math.sqrt((2 * peakY) / (24 * 1.35));
  console.log("FALL", JSON.stringify({ peakY, fallTime, predicted }));
  expect(fallTime).toBeGreaterThan(predicted * 0.75);
  expect(fallTime).toBeLessThan(predicted * 1.35);
  expect(Math.min(...s.map((x) => x.w!))).toBeGreaterThan(0.98);
  // recovered: can walk again
  const before = await page.evaluate(() => window.__tom!.game.player.position.x);
  await hold(page, ["KeyW"], 600);
  expect(await page.evaluate(() => window.__tom!.game.player.position.x)).toBeGreaterThan(before + 0.4);
  expect(log.errors).toEqual([]);
});

test("sprint in a circle: planted feet do not slide, the body leans into the turn", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  const open = await findOpenGround(page);
  await teleport(page, open[0] - 4.5, open[1], 0);
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(1200); // build up into a sprint
  await startSampler(page);
  // turn the camera steadily: W follows it, so the runner circles
  for (let i = 0; i < 40; i++) {
    await page.evaluate(() => (window.__tom!.game.cam.yaw += 0.07));
    await page.waitForTimeout(50);
  }
  const s = await stopSampler(page);
  await page.keyboard.up("KeyW");
  await page.keyboard.up("ShiftLeft");
  const gait = await page.evaluate(() => window.__tom!.game.player.stats.gait);
  // foot slide: while a foot is the planted one (lowest, near the ground), how far does it move?
  let slide = 0;
  let travel = 0;
  let contact = 0;
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1]!;
    const b = s[i]!;
    travel += Math.hypot(b.px! - a.px!, b.pz! - a.pz!);
    for (const k of ["l", "r"] as const) {
      const ya = a[`${k}y`]!;
      const yb = b[`${k}y`]!;
      const other = k === "l" ? b.ry! : b.ly!;
      if (ya - a.py! < 0.13 && yb - b.py! < 0.13 && yb <= other) {
        slide += Math.hypot(b[`${k}x`]! - a[`${k}x`]!, b[`${k}z`]! - a[`${k}z`]!);
        contact++;
      }
    }
  }
  const maxLean = Math.max(...s.map((x) => Math.abs(x.lean!)));
  const speed = (travel / (s[s.length - 1]!.t! - s[0]!.t!)) * 1000;
  console.log("SPRINT", JSON.stringify({ gait, speed, travel, slide, contact, ratio: slide / travel, maxLean }));
  expect(speed).toBeGreaterThan(5);
  expect(contact).toBeGreaterThan(5);
  expect(slide / travel).toBeLessThan(0.15); // planted feet move < 15% of the distance run
  expect(maxLean).toBeGreaterThan(0.05);
  expect(Math.min(...s.map((x) => x.w!))).toBeGreaterThan(0.98);
  expect(log.errors).toEqual([]);
});

test("vault a trough, climb the plinth, crouch, focus-strafe; no T-pose through any transition", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  await startSampler(page);
  // vault: find a free-standing waist-high obstacle with clear ground on both sides of its thin axis
  const v = await page.evaluate(() => {
    const c = window.__tom!.game.level.collision;
    for (const b of c.boxes) {
      if (b.walk || b.enabled === false || b.yMin > 0.05 || b.yMax < 0.45 || b.yMax > 1.1) continue;
      const thinX = b.hx < b.hz; // local axis that is thin
      const half = Math.min(b.hx, b.hz);
      if (half > 0.45) continue;
      // world direction of the thin axis
      const dx = thinX ? b.cos : b.sin;
      const dz = thinX ? -b.sin : b.cos;
      const sx = b.cx - dx * (half + 0.95);
      const sz = b.cz - dz * (half + 0.95);
      const ex = b.cx + dx * (half + 0.9);
      const ez = b.cz + dz * (half + 0.9);
      if (!c.clear(sx, sz, 0, 0.35, 1.8) || !c.clear(ex, ez, 0, 0.35, 1.8)) continue;
      if (c.groundHeight(sx, sz, 0.3) > 0.05 || c.groundHeight(ex, ez, 0.3) > 0.05) continue;
      return { sx, sz, dx, dz, name: b.name, cx: b.cx, cz: b.cz, top: b.yMax };
    }
    return null;
  });
  console.log("VAULT", JSON.stringify(v));
  expect(v).not.toBeNull();
  const yaw = Math.atan2(v!.dx, v!.dz);
  await teleport(page, v!.sx, v!.sz, yaw);
  await page.evaluate((y) => (window.__tom!.game.cam.yaw = y + Math.PI), yaw); // W heads along the facing
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(250);
  await page.keyboard.press("Space");
  await page.waitForTimeout(900);
  await page.keyboard.up("KeyW");
  const vault = await page.evaluate(() => ({ vaults: window.__tom!.game.player.stats.vaults, x: window.__tom!.game.player.position.x, z: window.__tom!.game.player.position.z }));
  expect(vault.vaults).toBe(1);
  // landed on the far side of the obstacle
  expect((vault.x - v!.cx) * v!.dx + (vault.z - v!.cz) * v!.dz).toBeGreaterThan(0.3);

  // climb: face the plinth's east side and press Space
  const climbZ = await page.evaluate(() => {
    const g = window.__tom!.game;
    for (let z = -22; z <= -7; z += 0.5) if (g.level.collision.clear(6.55, z, 1.5, 0.35, 1.7)) return z;
    return -14.5;
  });
  await teleport(page, 7.6, climbZ, -Math.PI / 2);
  await page.evaluate(() => (window.__tom!.game.cam.yaw = Math.PI / 2));
  await page.waitForTimeout(200);
  await page.keyboard.press("Space");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/screens/42-climb.png" });
  await page.waitForTimeout(1200);
  const climb = await page.evaluate(() => ({ climbs: window.__tom!.game.player.stats.climbs, y: window.__tom!.game.player.position.y }));
  expect(climb.climbs).toBe(1);
  expect(climb.y).toBeCloseTo(1.5, 1);

  // crouch toggle and crouch-walk
  await page.keyboard.press("KeyC");
  await hold(page, ["KeyW"], 500);
  expect(await page.evaluate(() => window.__tom!.game.player.stats.gait)).toBe("crouch");
  await page.screenshot({ path: "test-results/screens/43-crouch.png" });
  await page.keyboard.press("KeyC");
  await page.waitForTimeout(150); // let a game frame consume the press
  expect(await page.evaluate(() => window.__tom!.game.player.crouched)).toBe(false);

  // focus (hold right mouse): the body keeps facing the camera while strafing
  const box = page.locator("canvas").first();
  const bb = (await box.boundingBox())!;
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down({ button: "right" });
  await page.waitForTimeout(400); // the body turns to face where the camera looks
  const yaw0 = await page.evaluate(() => window.__tom!.game.player.yaw);
  const camFacing = await page.evaluate(() => window.__tom!.game.cam.yaw + Math.PI);
  expect(Math.abs(Math.atan2(Math.sin(yaw0 - camFacing), Math.cos(yaw0 - camFacing)))).toBeLessThan(0.1);
  await hold(page, ["KeyD"], 600);
  const yaw1 = await page.evaluate(() => window.__tom!.game.player.yaw);
  const gait = await page.evaluate(() => window.__tom!.game.player.stats.gait);
  await page.mouse.up({ button: "right" });
  expect(gait).toBe("focus");
  expect(Math.abs(Math.atan2(Math.sin(yaw1 - yaw0), Math.cos(yaw1 - yaw0)))).toBeLessThan(0.3); // strafed, did not turn
  const s = await stopSampler(page);
  expect(Math.min(...s.map((x) => x.w!))).toBeGreaterThan(0.98);
  expect(log.errors).toEqual([]);
});

test("camera never ends inside geometry while orbiting along walls; interactions refused mid-air; input spam is harmless", async ({ page }) => {
  const log = watchConsole(page);
  await waitForTitle(page);
  await startNewGame(page);
  const spots: Array<[number, number]> = [
    [-4.5, 51.5], // against the gopuram pier
    [5, -5], // beside the temple plinth
    [-24.6, 28], // at the player's house wall
    [118, -5], // the granary
  ];
  let inside = 0;
  for (const [x, z] of spots) {
    await teleport(page, x, z, 0);
    for (let i = 0; i < 16; i++) {
      inside += await page.evaluate((a) => {
        const g = window.__tom!.game;
        g.cam.yaw = a;
        g.cam.pitch = 0.1 + (a % 1) * 0.5;
        return 0;
      }, (i * Math.PI) / 8);
      await page.waitForTimeout(60);
      const hitInfo = await page.evaluate(() => {
        const g = window.__tom!.game;
        const c = g.camera.position;
        if (!g.level.collision.inside(c.x, c.y, c.z, 0)) return null;
        const p = g.player.position;
        return { cam: c.toArray().map((v) => +v.toFixed(2)), player: p.toArray().map((v) => +v.toFixed(2)), boom: g.cam.boom };
      });
      if (hitInfo) console.log("CAM-INSIDE", JSON.stringify({ x, z, i, ...hitInfo }));
      inside += hitInfo ? 1 : 0;
    }
  }
  const clipped = await page.evaluate(() => window.__tom!.game.cam.clippedFrames);
  expect(inside).toBe(0);
  expect(clipped).toBe(0);

  // mid-air: the prompt disappears and E does nothing
  await teleport(page, 3.5, 40.8, Math.PI);
  await page.evaluate(() => (window.__tom!.session.state.worldMinutes = 9 * 60));
  await page.evaluate(() => window.__tom!.game.npcs.snapToSchedule());
  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(150);
  await expect(page.getByTestId("dialogue")).toHaveCount(0);
  // spam: jump, crouch, interact and movement hammered together never leaves the body in a broken state
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press(["Space", "KeyC", "KeyE", "KeyW", "Space"][i % 5]!);
    await page.waitForTimeout(25);
  }
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.waitForTimeout(800);
  const st = await page.evaluate(() => ({ w: window.__tom!.game.player.animator.totalWeight(), y: window.__tom!.game.player.position.y, state: window.__tom!.game.player.state }));
  expect(st.w).toBeGreaterThan(0.98);
  expect(st.y).toBeGreaterThanOrEqual(0);
  expect(log.errors).toEqual([]);
});

test("close-ups: face and hands read as structured forms in the engine", async ({ page }) => {
  await waitForTitle(page);
  await startNewGame(page);
  await teleport(page, 0, 20, Math.PI);
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__tom!.game.pause());
  const shot = async (name: string, bone: "head" | "hand_R", dist: number, yawOff: number, dy: number) => {
    await page.evaluate(
      ([bone, dist, yawOff, dy]) => {
        const g = window.__tom!.game;
        const rig = g.player.rig!;
        const b = bone === "head" ? rig.head : rig.hand[1];
        const p = b.getWorldPosition(g.player.position.clone());
        p.y += dy as number;
        const a = g.player.yaw + (yawOff as number);
        g.camera.position.set(p.x + Math.sin(a) * (dist as number), p.y + 0.02, p.z + Math.cos(a) * (dist as number));
        g.camera.lookAt(p);
      },
      [bone, dist, yawOff, dy] as const,
    );
    await page.waitForTimeout(250);
    await page.locator(".pause").evaluate((e) => ((e as HTMLElement).style.visibility = "hidden"));
    await page.screenshot({ path: `test-results/screens/${name}.png` });
  };
  await shot("44-face-front", "head", 0.55, 0, 0.08);
  await shot("45-face-three-quarter", "head", 0.6, 0.7, 0.08);
  await shot("46-hand", "hand_R", 0.45, 1.2, -0.05);
});
