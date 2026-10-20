import type { ItemDefinition } from "../game/core/types";

// Icons are glyphs until the painted icon set (asserts_img/COLECTABLES.jpg style) is produced.
export const ITEMS: ItemDefinition[] = [
  // flowers
  { id: "jasmine_flower", name: "Jasmine (Malli)", description: "Small white blossoms with a strong evening scent. Grown along the house fronts.", category: "flower", icon: "✿", maxStack: 20, tags: ["flower", "garland"], sellPrice: 1 },
  { id: "marigold_flower", name: "Marigold", description: "Bright orange marigold heads from the settlement garden.", category: "flower", icon: "❁", maxStack: 20, tags: ["flower", "garland"], sellPrice: 1 },
  { id: "hibiscus_flower", name: "Hibiscus", description: "A red hibiscus from the bushes by the tank steps.", category: "flower", icon: "✾", maxStack: 20, tags: ["flower"], sellPrice: 1 },
  // building and repair materials
  { id: "channel_stone", name: "Dressed stone", description: "A squared granite block salvaged from fallen walls.", category: "material", icon: "▰", maxStack: 10, tags: ["stone", "repair"] },
  { id: "lime_clay", name: "Lime clay", description: "Pale sticky clay dug from the bank past the channel. Mixed into mortar.", category: "material", icon: "◍", maxStack: 10, tags: ["clay", "repair"] },
  { id: "lime_mortar", name: "Lime mortar", description: "Worked lime mortar, ready to bed stones and bricks.", category: "crafted", icon: "◉", maxStack: 5, tags: ["repair"] },
  { id: "timber", name: "Timber", description: "A seasoned length of wood from the woodland logs.", category: "material", icon: "▬", maxStack: 10, tags: ["wood", "repair"], sellPrice: 1 },
  { id: "dry_grass", name: "Thatching grass", description: "Long dry grass cut at the field edges.", category: "material", icon: "⋰", maxStack: 20, tags: ["thatch"] },
  { id: "thatch_bundle", name: "Thatch bundle", description: "Grass tied into a tight bundle for roofing.", category: "crafted", icon: "≋", maxStack: 10, tags: ["thatch", "repair"] },
  { id: "rope", name: "Coir rope", description: "Strong coconut-fibre rope.", category: "trade", icon: "➰", maxStack: 5, tags: ["rope"], sellPrice: 2 },
  { id: "wooden_bucket", name: "Wooden bucket", description: "A bound timber bucket for drawing water.", category: "crafted", icon: "◫", maxStack: 2, tags: ["repair"] },
  { id: "sluice_board", name: "Sluice board", description: "Planks pinned into a gate board for the field sluice.", category: "crafted", icon: "▤", maxStack: 1, tags: ["repair"], questProtected: true },
  { id: "banana_twine", name: "Banana-fibre twine", description: "Strong thread stripped from banana stems, used to string flowers and tie bundles.", category: "trade", icon: "〰", maxStack: 10, tags: ["garland"], sellPrice: 1 },
  // tools and vessels
  { id: "sickle", name: "Sickle", description: "A curved iron blade for cutting back overgrowth.", category: "tool", icon: "☾", maxStack: 1, tags: ["tool"], questProtected: true },
  { id: "water_vessel", name: "Water pot (empty)", description: "A clay kudam. Fill it at the tank, the water point or a working well.", category: "tool", icon: "♁", maxStack: 1, tags: ["tool", "vessel"] },
  { id: "water_vessel_full", name: "Water pot (full)", description: "A clay pot full of water, ready for planting beds.", category: "tool", icon: "⛁", maxStack: 1, tags: ["tool", "vessel"] },
  // farming
  { id: "seed_packet", name: "Vegetable seeds", description: "Brinjal and greens seed wrapped in leaf paper.", category: "material", icon: "⁘", maxStack: 10, tags: ["seed"], sellPrice: 1 },
  { id: "produce", name: "Fresh vegetables", description: "Brinjal, greens and a few chillies from your plot.", category: "produce", icon: "❦", maxStack: 20, tags: ["produce", "festival"], sellPrice: 3 },
  // crafted goods
  { id: "flower_garland", name: "Flower garland", description: "A doorway garland of marigold and jasmine strung on banana-fibre twine.", category: "crafted", icon: "❀", maxStack: 3, tags: ["garland", "decor"], questProtected: true },
  { id: "handwoven_cloth", name: "Handwoven cloth", description: "A length of cotton cloth from Meena's loom, red with a woven border.", category: "crafted", icon: "▦", maxStack: 3, tags: ["cloth", "festival"], sellPrice: 6 },
  { id: "festival_bundle", name: "Festival offering bundle", description: "A basket of garland, vegetables and new cloth, prepared together for the lamp festival.", category: "quest", icon: "✺", maxStack: 1, tags: ["festival"], questProtected: true },
  // discoveries
  { id: "palm_leaf_manuscript", name: "Palm-leaf manuscript", description: "Bound palm-leaf folios found sealed in the old pavilion. The writing is faded but careful.", category: "quest", icon: "▥", maxStack: 1, tags: ["discovery"], questProtected: true },
  // home decorations
  { id: "oil_lamp", name: "Clay oil lamp", description: "A small lamp on a brass stand. Place it at your home.", category: "decor", icon: "♨", maxStack: 3, tags: ["decor"], sellPrice: 2 },
  { id: "woven_mat", name: "Woven mat", description: "A palm-leaf sleeping mat with a red border. Place it on your veranda.", category: "decor", icon: "▭", maxStack: 2, tags: ["decor"], sellPrice: 2 },
  { id: "kolam_powder", name: "Kolam rice flour", description: "Fine rice flour for drawing a kolam on the doorstep. Used up when drawn.", category: "decor", icon: "❈", maxStack: 10, tags: ["decor"] },
  { id: "tulsi_pot", name: "Tulsi pot", description: "Holy basil in a painted pot, a gift from Amudha.", category: "decor", icon: "♣", maxStack: 1, tags: ["decor"], questProtected: true },
];
