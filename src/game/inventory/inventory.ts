import type { ItemDefinition, ItemStack } from "../core/types";

export type Inventory = Array<ItemStack | null>;
type Lookup = (id: string) => ItemDefinition | undefined;
export type InventoryResult = { ok: true; inventory: Inventory } | { ok: false; reason: string };

export function countItem(inv: Inventory, itemId: string): number {
  let n = 0;
  for (const s of inv) if (s && s.itemId === itemId) n += s.quantity;
  return n;
}

export function hasItems(inv: Inventory, stacks: ItemStack[]): boolean {
  return stacks.every((s) => countItem(inv, s.itemId) >= s.quantity);
}

/** Adds items; never partially applies. Returns a new inventory. */
export function addItems(inv: Inventory, stacks: ItemStack[], lookup: Lookup): InventoryResult {
  const next = inv.map((s) => (s ? { ...s } : null));
  for (const { itemId, quantity } of stacks) {
    const def = lookup(itemId);
    if (!def) return { ok: false, reason: `Unknown item ${itemId}` };
    let remaining = quantity;
    for (const s of next) {
      if (remaining === 0) break;
      if (s && s.itemId === itemId && s.quantity < def.maxStack) {
        const take = Math.min(def.maxStack - s.quantity, remaining);
        s.quantity += take;
        remaining -= take;
      }
    }
    for (let i = 0; i < next.length && remaining > 0; i++) {
      if (next[i] === null) {
        const take = Math.min(def.maxStack, remaining);
        next[i] = { itemId, quantity: take };
        remaining -= take;
      }
    }
    if (remaining > 0) return { ok: false, reason: "Your bag is full." };
  }
  return { ok: true, inventory: next };
}

/** Removes items; validates the full transaction before changing anything. */
export function removeItems(inv: Inventory, stacks: ItemStack[]): InventoryResult {
  if (!hasItems(inv, stacks)) return { ok: false, reason: "You don't have the required materials." };
  const next = inv.map((s) => (s ? { ...s } : null));
  for (const { itemId, quantity } of stacks) {
    let remaining = quantity;
    for (let i = next.length - 1; i >= 0 && remaining > 0; i--) {
      const s = next[i];
      if (s && s.itemId === itemId) {
        const take = Math.min(s.quantity, remaining);
        s.quantity -= take;
        remaining -= take;
        if (s.quantity === 0) next[i] = null;
      }
    }
  }
  return { ok: true, inventory: next };
}

/** Removes inputs then adds outputs as one transaction (crafting, trading). */
export function exchange(inv: Inventory, remove: ItemStack[], add: ItemStack[], lookup: Lookup): InventoryResult {
  const removed = removeItems(inv, remove);
  if (!removed.ok) return removed;
  return addItems(removed.inventory, add, lookup);
}
