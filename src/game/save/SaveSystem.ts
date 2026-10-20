import type { GameState, Settings } from "../core/types";
import type { Definitions } from "../core/defs";
import { validateSave } from "./validateSave";
import { BADGES, MISSIONS, MOM_BY_ID, SAREES, TEMPLE_BY_ID, newProfile, type Profile } from "../visit/rules";

const DB_NAME = "temple-of-monks";
const DB_VERSION = 1;
const STORE = "saves";
const MAIN = "slot_main";
const BACKUP = "slot_main_backup";
const SETTINGS = "settings";

export type LoadResult =
  | { status: "empty" }
  | { status: "loaded"; state: GameState; warnings: string[]; fromBackup: boolean }
  | { status: "failed"; error: string };

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  effectsVolume: 0.8,
  mouseSensitivity: 1,
  invertY: false,
  graphicsQuality: "high",
  textScale: 1,
  fov: 55,
  showIntro: true,
  keyBindings: {},
  dialogueBackdrop: 0.9,
  typewriter: true,
  showTargetRing: true,
  ambientOcclusion: false,
  renderScale: 1,
  reducedMotion: false,
  highContrast: false,
  tutorial: true,
};

/** IndexedDB persistence with a rolling backup and validation on every read. */
export class SaveSystem {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(
    private defs: Definitions,
    private idb: IDBFactory = globalThis.indexedDB,
  ) {}

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (!this.idb) return reject(new Error("IndexedDB is not available in this browser."));
        const req = this.idb.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("Could not open save database."));
        req.onblocked = () => reject(new Error("Save database is blocked by another tab."));
      });
      this.dbPromise.catch(() => (this.dbPromise = null));
    }
    return this.dbPromise;
  }

  private async get(key: string): Promise<unknown> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async putMany(entries: Array<[string, unknown]>): Promise<void> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const [k, v] of entries) store.put(v, k);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Save aborted."));
    });
  }

  async hasSave(): Promise<boolean> {
    try {
      return (await this.get(MAIN)) !== undefined;
    } catch {
      return false;
    }
  }

  /** Writes the new save and moves the previous valid save into the backup slot, atomically. */
  async save(state: GameState): Promise<void> {
    const data = JSON.parse(JSON.stringify(state)) as GameState; // plain clone, also proves serializability
    const previous = await this.get(MAIN).catch(() => undefined);
    const entries: Array<[string, unknown]> = [[MAIN, data]];
    if (previous !== undefined && validateSave(previous, this.defs).ok) entries.push([BACKUP, previous]);
    await this.putMany(entries);
  }

  async load(): Promise<LoadResult> {
    let main: unknown;
    try {
      main = await this.get(MAIN);
    } catch (e) {
      return { status: "failed", error: `Could not read saves: ${(e as Error).message}` };
    }
    if (main === undefined) return { status: "empty" };
    const check = validateSave(main, this.defs);
    if (check.ok) return { status: "loaded", state: check.state, warnings: check.warnings, fromBackup: false };

    // Main save is corrupt or incompatible: keep a copy for diagnosis, then try the backup.
    await this.putMany([[`corrupt_${Date.now()}`, main]]).catch(() => undefined);
    const backup = await this.get(BACKUP).catch(() => undefined);
    const b = backup === undefined ? null : validateSave(backup, this.defs);
    if (b?.ok) return { status: "loaded", state: b.state, warnings: [`Main save was unreadable (${check.error}); restored the backup.`, ...b.warnings], fromBackup: true };
    return { status: "failed", error: check.error };
  }

  async deleteSave(): Promise<void> {
    const db = await this.db();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(MAIN);
      tx.objectStore(STORE).delete(BACKUP);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadSettings(): Promise<Settings> {
    try {
      const raw = await this.get(SETTINGS);
      return sanitizeSettings(raw);
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings(s: Settings): Promise<void> {
    await this.putMany([[SETTINGS, { ...s }]]);
  }

  /** Temple Visit progression (Kumkum, unlocks, personal bests, badges, missions); validated on read. */
  async loadVisitProfile(): Promise<Profile> {
    try {
      return sanitizeProfile(await this.get(VISIT_PROFILE));
    } catch {
      return newProfile();
    }
  }

  async saveVisitProfile(p: Profile): Promise<void> {
    await this.putMany([[VISIT_PROFILE, JSON.parse(JSON.stringify(p))]]);
  }

  /** Test hook: write arbitrary raw data into the main slot. */
  async writeRawForTesting(raw: unknown): Promise<void> {
    await this.putMany([[MAIN, raw]]);
  }
}

export function sanitizeSettings(raw: unknown): Settings {
  const s = { ...DEFAULT_SETTINGS };
  if (typeof raw !== "object" || raw === null) return s;
  const r = raw as Record<string, unknown>;
  const num = (k: keyof Settings, min: number, max: number) => {
    const v = r[k];
    if (typeof v === "number" && Number.isFinite(v)) (s[k] as number) = Math.min(max, Math.max(min, v));
  };
  num("masterVolume", 0, 1);
  num("musicVolume", 0, 1);
  num("effectsVolume", 0, 1);
  num("mouseSensitivity", 0.2, 3);
  num("textScale", 0.85, 1.4);
  num("fov", 45, 75);
  if (typeof r.invertY === "boolean") s.invertY = r.invertY;
  if (typeof r.showIntro === "boolean") s.showIntro = r.showIntro;
  if (typeof r.typewriter === "boolean") s.typewriter = r.typewriter;
  if (typeof r.showTargetRing === "boolean") s.showTargetRing = r.showTargetRing;
  num("dialogueBackdrop", 0.4, 1);
  if (typeof r.keyBindings === "object" && r.keyBindings !== null) {
    const kb: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(r.keyBindings as Record<string, unknown>)) {
      if (Array.isArray(v) && v.every((c) => typeof c === "string" && c.length < 32) && v.length <= 3) kb[k] = v as string[];
    }
    s.keyBindings = kb;
  }
  if (r.graphicsQuality === "low" || r.graphicsQuality === "medium" || r.graphicsQuality === "high") s.graphicsQuality = r.graphicsQuality;
  if (typeof r.ambientOcclusion === "boolean") s.ambientOcclusion = r.ambientOcclusion;
  if (typeof r.renderScale === "number" && Number.isFinite(r.renderScale)) s.renderScale = Math.min(1, Math.max(0.5, r.renderScale));
  if (typeof r.reducedMotion === "boolean") s.reducedMotion = r.reducedMotion;
  if (typeof r.highContrast === "boolean") s.highContrast = r.highContrast;
  if (typeof r.tutorial === "boolean") s.tutorial = r.tutorial;
  return s;
}

const VISIT_PROFILE = "visit_profile";

/** Untrusted stored profile -> a valid Profile (unknown ids dropped, numbers clamped). */
export function sanitizeProfile(raw: unknown): Profile {
  const p = newProfile();
  if (!raw || typeof raw !== "object") return p;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : d);
  const ids = (v: unknown, valid: (x: string) => boolean, base: string[]) => (Array.isArray(v) ? [...new Set([...base, ...v.filter((x): x is string => typeof x === "string" && valid(x))])] : base);
  p.kumkum = num(r.kumkum);
  p.runs = num(r.runs);
  p.chappalStreak = num(r.chappalStreak);
  p.unlockedMoms = ids(r.unlockedMoms, (x) => MOM_BY_ID.has(x), p.unlockedMoms);
  p.unlockedTemples = ids(r.unlockedTemples, (x) => TEMPLE_BY_ID.has(x), p.unlockedTemples);
  p.unlockedSarees = ids(r.unlockedSarees, (x) => SAREES.some((s) => s.id === x), p.unlockedSarees);
  p.badges = ids(r.badges, (x) => BADGES.some((b) => b.id === x), []);
  if (r.personalBest && typeof r.personalBest === "object")
    for (const [k, v] of Object.entries(r.personalBest as Record<string, unknown>)) if (TEMPLE_BY_ID.has(k)) p.personalBest[k] = num(v);
  if (r.sareeChoice && typeof r.sareeChoice === "object")
    for (const [k, v] of Object.entries(r.sareeChoice as Record<string, unknown>)) if (MOM_BY_ID.has(k) && typeof v === "string" && p.unlockedSarees.includes(v)) p.sareeChoice[k] = v;
  const m = r.missions as Record<string, unknown> | undefined;
  if (m && typeof m.day === "string") p.missions = { day: m.day, ids: ids(m.ids, (x) => MISSIONS.some((q) => q.id === x), []), done: ids(m.done, (x) => MISSIONS.some((q) => q.id === x), []) };
  return p;
}
