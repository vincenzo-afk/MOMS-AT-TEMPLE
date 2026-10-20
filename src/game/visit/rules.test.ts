import { describe, expect, it } from "vitest";
import { act, addStress, blessingsMultiplier, finalScore, isFestivalDay, missionsFor, newProfile, newRun, settleRun, unlock, ACTIONS, MOMS, TEMPLES } from "./rules";

describe("temple visit scoring (GAME_DESIGN.md §3)", () => {
  it("scores actions, applies the Devotional Mom passive and refuses repeats", () => {
    const r = newRun("devotional", "city", false);
    expect(act(r, "wake_early").points).toBe(13); // 10 x 1.25
    expect(act(r, "family_pattu").points).toBe(20);
    expect(act(r, "wake_early").ok).toBe(false);
    expect(r.punya).toBe(33);
  });

  it("only devotional actions fill Blessings; hustle never does", () => {
    const r = newRun("hustle", "city", false);
    act(r, "parking_close");
    act(r, "chappals_bush");
    expect(r.blessings).toBe(0);
    act(r, "chappals_stand");
    expect(r.blessings).toBeGreaterThan(0);
  });

  it("three in a row of one category doubles the fourth; penalties break the streak", () => {
    const r = newRun("social", "city", false);
    act(r, "family_pattu");
    act(r, "side_gate");
    act(r, "aunty_chat");
    const fourth = act(r, "relative_merge");
    expect(fourth.combo).toBe(true);
    expect(fourth.points).toBe(Math.round(30 * 1.25 * 2));
    const q = newRun("devotional", "city", false);
    act(q, "wake_early");
    act(q, "pack_bag");
    act(q, "forgot_coconut");
    act(q, "remember_tithi");
    expect(act(q, "chappals_stand").combo).toBe(false);
  });

  it("Stress at 100 ends the run early; calm actions drain it", () => {
    const r = newRun("hustle", "city", false);
    act(r, "child_wandered");
    const before = r.stress;
    act(r, "cutter_calm");
    expect(r.stress).toBeLessThan(before);
    expect(addStress(r, 200)).toBe(true);
    expect(r.ended).toBe("stress");
    expect(act(r, "gossip").ok).toBe(false);
  });

  it("Paati's stress fills at half rate; festival doubles points, penalties and their stress", () => {
    const a = newRun("devotional", "city", false);
    const b = newRun("paati", "city", false);
    act(a, "child_wandered");
    act(b, "child_wandered");
    expect(b.stress).toBeCloseTo(a.stress / 2);
    const f = newRun("devotional", "city", true);
    expect(act(f, "family_pattu").points).toBe(40);
    expect(act(f, "forgot_coconut").points).toBe(-20);
  });

  it("Blessings multiply the final score per the table, Stress caps it, Kumkum is a tenth", () => {
    expect([0, 24, 25, 49, 50, 74, 75, 99, 100].map(blessingsMultiplier)).toEqual([1, 1, 1.25, 1.25, 1.5, 1.5, 2, 2, 3]);
    const r = newRun("devotional", "city", false);
    r.punya = 400;
    r.blessings = 100;
    r.stress = 50;
    const s = finalScore(r);
    expect(s.total).toBe(Math.round(400 * 3 * 0.75));
    expect(s.kumkum).toBe(Math.floor(s.total / 10));
    expect(s.fullyBlessed).toBe(true);
  });

  it("108 rounds of pradakshina only make sense in festival mode, but rounds always count", () => {
    const r = newRun("devotional", "city", true);
    for (let i = 0; i < 9; i++) act(r, "pradakshina_round");
    expect(r.pradakshina).toBe(9);
  });
});

describe("progression (§5-§7)", () => {
  it("has the five moms, three temples and every stage's actions", () => {
    expect(MOMS.map((m) => m.id)).toEqual(["devotional", "hustle", "social", "instagram", "paati"]);
    expect(TEMPLES.map((t) => t.id)).toEqual(["city", "neighbourhood", "hill"]);
    for (const st of ["home", "arrival", "queue", "rituals", "darshan", "exit", "steps"]) expect(ACTIONS.some((a) => a.stage === st)).toBe(true);
  });

  it("settling a run pays Kumkum, records the personal best and badges, tracks missions", () => {
    const p = newProfile();
    const r = newRun("devotional", "city", false);
    act(r, "coconut_clean");
    act(r, "gossip");
    act(r, "chappals_found");
    r.ended = "exit";
    const sum = settleRun(p, r, "2026-10-20");
    expect(p.kumkum).toBe(sum.kumkumEarned);
    expect(p.personalBest.city).toBe(sum.score.total);
    expect(sum.newBest).toBe(true);
    expect(p.badges).toEqual(expect.arrayContaining(["coconut_sniper", "gossip_queen", "chappal_keeper"]));
    expect(p.missions.ids).toHaveLength(3);
    const again = settleRun(p, newRun("devotional", "city", false), "2026-10-20");
    expect(again.newBest).toBe(false);
    expect(p.chappalStreak).toBe(0);
  });

  it("unlocks cost Kumkum and only happen once", () => {
    const p = newProfile();
    expect(unlock(p, "mom", "hustle")).toBe(false);
    p.kumkum = 500;
    expect(unlock(p, "mom", "hustle")).toBe(true);
    expect(p.kumkum).toBe(380);
    expect(unlock(p, "mom", "hustle")).toBe(false);
    expect(unlock(p, "temple", "hill")).toBe(true);
    expect(unlock(p, "saree", "peacock")).toBe(true);
  });

  it("daily missions and festival days are deterministic per date", () => {
    expect(missionsFor("2026-10-20")).toEqual(missionsFor("2026-10-20"));
    expect(new Set(missionsFor("2026-10-21")).size).toBe(3);
    const days = Array.from({ length: 60 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
    const fest = days.filter(isFestivalDay).length;
    expect(fest).toBeGreaterThan(2);
    expect(fest).toBeLessThan(25);
  });
});
