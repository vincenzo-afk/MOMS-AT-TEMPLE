import type { GameState, Settings } from "../core/types";
import type { Definitions } from "../core/defs";
import { validateSave } from "./validateSave";

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
  if (r.graphicsQuality === "low" || r.graphicsQuality === "medium" || r.graphicsQuality === "high") s.graphicsQuality = r.graphicsQuality;
  return s;
}
