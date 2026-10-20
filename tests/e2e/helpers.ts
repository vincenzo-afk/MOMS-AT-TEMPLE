import type { Page } from "@playwright/test";

export interface ConsoleLog {
  errors: string[];
  warnings: string[];
}

export function watchConsole(page: Page): ConsoleLog {
  const log: ConsoleLog = { errors: [], warnings: [] };
  page.on("console", (m) => {
    if (m.type() === "error") log.errors.push(m.text());
    if (m.type() === "warning") log.warnings.push(m.text());
  });
  page.on("pageerror", (e) => log.errors.push(`pageerror: ${e.message}`));
  return log;
}

export async function waitForTitle(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("title").waitFor({ timeout: 90_000 });
}

/** Starts a new game with the opening sequence disabled, then waits for play mode. */
export async function startNewGame(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const t = window.__tom!;
    t.game.settings = { ...t.game.settings, showIntro: false };
    await t.saves.deleteSave();
  });
  await page.getByTestId("new-game").click();
  await page.getByTestId("hud").waitFor();
}

/** Walk by holding keys for a duration (real input path). */
export async function hold(page: Page, keys: string[], ms: number): Promise<void> {
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForTimeout(ms);
  for (const k of keys) await page.keyboard.up(k);
}

/** Moves the player next to a point (test shortcut for long walks; movement itself is tested separately). */
export async function teleport(page: Page, x: number, z: number, yaw = 0): Promise<void> {
  await page.evaluate(
    ([x, z, yaw]) => {
      const g = window.__tom!.game;
      g.player.teleport([x!, 0.5, z!], yaw!);
    },
    [x, z, yaw],
  );
  await page.waitForTimeout(150);
}

export async function pressE(page: Page): Promise<void> {
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(250);
}

/** Talk through a conversation, choosing the first option each time. */
export async function talkThrough(page: Page): Promise<void> {
  for (let i = 0; i < 12; i++) {
    const open = await page.getByTestId("dialogue").isVisible().catch(() => false);
    if (!open) return;
    const opt = page.getByTestId("option-0");
    if (await opt.isVisible().catch(() => false)) await opt.click();
    else await page.keyboard.press("Space");
    await page.waitForTimeout(150);
  }
}
