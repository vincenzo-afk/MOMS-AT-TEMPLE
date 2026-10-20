import type { ItemDefinition } from "../../game/core/types";
import { ITEM_ICONS } from "../../data/itemIcons";

/** The item's rendered icon (public/assets/icons, made by blender/scripts/render_icons.py), else its glyph. */
export function ItemIcon({ def, small = false }: { def: ItemDefinition | undefined | null; small?: boolean }) {
  if (!def) return null;
  const cls = `icon cat-${def.category}${small ? " small-icon" : ""}`;
  return ITEM_ICONS.has(def.id) ? <img className={`${cls} icon-img`} src={`/assets/icons/${def.id}.png`} alt="" draggable={false} /> : <span className={cls}>{def.icon}</span>;
}
