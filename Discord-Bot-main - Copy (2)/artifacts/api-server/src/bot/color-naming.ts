// Procedural naming + rarity for any hex color.
// Quantizes RGB to a 16-step grid (16^3 = 4096 unique buckets) so visually
// near-identical shades share a name, but distinguishable shades don't.

const STEPS = 16;

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITY_INFO: Record<Rarity, { label: string; emoji: string; color: number; rank: number }> = {
  common:    { label: "Common",    emoji: "⚪", color: 0x95a5a6, rank: 0 },
  uncommon:  { label: "Uncommon",  emoji: "🟢", color: 0x2ecc71, rank: 1 },
  rare:      { label: "Rare",      emoji: "🔵", color: 0x3498db, rank: 2 },
  epic:      { label: "Epic",      emoji: "🟣", color: 0x9b59b6, rank: 3 },
  legendary: { label: "Legendary", emoji: "🌟", color: 0xf1c40f, rank: 4 },
};

export const ALL_RARITIES: Rarity[] = ["legendary", "epic", "rare", "uncommon", "common"];
export const TOTAL_BUCKETS = STEPS * STEPS * STEPS; // 4096

// 8 pure primaries (full saturation extremes) — used for the "Pure Heart" badge
export const PURE_PRIMARY_BUCKETS: number[] = [
  0xff0000, 0x00ff00, 0x0000ff, 0xffff00,
  0xff00ff, 0x00ffff, 0xffffff, 0x000000,
];

export const HUE_FAMILY_NAMES = [
  "Red", "Orange", "Yellow", "Yellow-Green",
  "Green", "Spring Green", "Cyan", "Sky",
  "Blue", "Violet", "Magenta", "Pink",
];

// Indexes (into HUE_FAMILY_NAMES / HUE_NAMES) that form the classic ROYGBIV rainbow
export const RAINBOW_SECTORS = [0, 1, 2, 4, 8, 9];

function quantizeChannel(c: number): number {
  return Math.round((c / 255) * (STEPS - 1)) * Math.round(255 / (STEPS - 1));
}

export function quantizeHex(hex: number): number {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return (quantizeChannel(r) << 16) | (quantizeChannel(g) << 8) | quantizeChannel(b);
}

export function bucketId(hex: number): string {
  return quantizeHex(hex).toString(16).padStart(6, "0").toUpperCase();
}

export function hexFromBucketId(id: string): number {
  return parseInt(id, 16);
}

export function formatHex(hex: number): string {
  return `#${hex.toString(16).padStart(6, "0").toUpperCase()}`;
}

export function rgbToHsl(hex: number): { h: number; s: number; l: number } {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h, s, l };
}

const PREFIXES = [
  "Aurora", "Burning", "Crystal", "Dusty", "Electric", "Faded", "Frosty", "Glowing",
  "Hidden", "Imperial", "Liquid", "Mystic", "Neon", "Pale", "Quiet", "Royal",
  "Shimmering", "Twilight", "Velvet", "Wild", "Ancient", "Bold", "Cosmic", "Dreamy",
  "Eternal", "Fierce", "Gilded", "Holy", "Lunar", "Misty", "Solar", "Stormy",
  "Vibrant", "Whispered", "Arcane", "Blazing", "Chrome", "Drifting", "Echoing", "Forgotten",
];

const HUE_NAMES: string[][] = [
  ["Crimson", "Scarlet", "Ruby", "Cherry", "Garnet", "Carmine", "Vermillion", "Cinnabar", "Brick", "Maroon", "Wine", "Burgundy", "Rust", "Coral", "Tomato", "Flame"],
  ["Tangerine", "Apricot", "Marigold", "Pumpkin", "Persimmon", "Carrot", "Amber", "Honey", "Saffron", "Sienna", "Copper", "Bronze", "Sunset", "Ember", "Mango", "Citrus"],
  ["Gold", "Citron", "Lemon", "Canary", "Mustard", "Banana", "Daffodil", "Goldenrod", "Sunflower", "Topaz", "Wheat", "Straw", "Butter", "Sand", "Beeswax", "Pollen"],
  ["Pear", "Lime", "Chartreuse", "Olive", "Pistachio", "Pickle", "Avocado", "Sap", "Vine", "Apple", "Bamboo", "Wasabi", "Pesto", "Sprout", "Kiwi", "Grasshopper"],
  ["Emerald", "Jade", "Forest", "Pine", "Sage", "Clover", "Shamrock", "Hunter", "Spruce", "Fern", "Leaf", "Grass", "Basil", "Spinach", "Cactus", "Moss"],
  ["Seafoam", "Mint", "Aquamarine", "Spring", "Algae", "Glacier", "Lichen", "Reed", "Eucalyptus", "Beryl", "Verdigris", "Patina", "Malachite", "Celadon", "Jadeite", "Wintergreen"],
  ["Cyan", "Aqua", "Turquoise", "Lagoon", "Tiffany", "Pool", "Frost", "Ice", "Mist", "Sky", "Tropical", "Caribbean", "Ocean", "Bay", "Reef", "Tidal"],
  ["Azure", "Cerulean", "Powder", "Robin", "Teal", "Aegean", "Cornflower", "Forget-Me-Not", "Bluebell", "Cove", "Pacific", "Aquamarine", "Larimar", "Topaz", "Aqua", "Maya"],
  ["Sapphire", "Cobalt", "Royal", "Navy", "Indigo", "Denim", "Lapis", "Marine", "Midnight", "Berry", "Atlantic", "Twilight", "Yale", "Persian", "Steel", "Slate"],
  ["Violet", "Iris", "Lavender", "Wisteria", "Hyacinth", "Periwinkle", "Heliotrope", "Amethyst", "Lilac", "Lupine", "Orchid", "Pansy", "Aster", "Petunia", "Foxglove", "Bellflower"],
  ["Magenta", "Fuchsia", "Mauve", "Plum", "Berry", "Grape", "Boysenberry", "Mulberry", "Tyrian", "Byzantium", "Heather", "Thistle", "Damson", "Currant", "Eggplant", "Aubergine"],
  ["Rose", "Pink", "Blush", "Salmon", "Coral", "Watermelon", "Flamingo", "Carnation", "Peony", "Cerise", "Raspberry", "Strawberry", "Punch", "Bubblegum", "Cotton", "Sakura"],
];

const GRAY_NAMES = ["Void", "Obsidian", "Onyx", "Charcoal", "Graphite", "Slate", "Stone", "Smoke", "Pewter", "Ash", "Silver", "Pearl", "Mist", "Linen", "Bone", "Snow"];
const BROWN_NAMES = ["Espresso", "Mocha", "Coffee", "Walnut", "Mahogany", "Chestnut", "Cocoa", "Caramel", "Hazel", "Tan", "Khaki", "Toffee", "Bronze", "Sepia", "Umber", "Camel"];

export function pickSector(h: number, s: number, l: number): number {
  // Returns 0-11 for hue sectors, -1 for gray, -2 for brown
  if (s < 0.12 || l < 0.04 || l > 0.96) return -1;
  // Brown: warm muted earth tones
  if (s < 0.45 && l < 0.55 && (h < 0.13 || h > 0.95)) return -2;
  return Math.floor(h * 12) % 12;
}

// Deterministic hash from a 24-bit int
function hash(n: number): number {
  let x = n + 0x9e3779b9;
  x = ((x ^ (x >>> 16)) * 0x21f0aaad) >>> 0;
  x = ((x ^ (x >>> 15)) * 0x735a2d97) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
}

export function colorName(hex: number): string {
  const q = quantizeHex(hex);
  const { h, s, l } = rgbToHsl(q);
  const sector = pickSector(h, s, l);

  let pool: string[];
  if (sector === -1) pool = GRAY_NAMES;
  else if (sector === -2) pool = BROWN_NAMES;
  else pool = HUE_NAMES[sector]!;

  const seed = hash(q);
  const prefixIdx = seed % PREFIXES.length;
  const nameIdx = Math.floor(seed / PREFIXES.length) % pool.length;
  return `${PREFIXES[prefixIdx]} ${pool[nameIdx]}`;
}

// Some hand-picked legendary hex codes (after quantization)
const LEGENDARY_BUCKETS = new Set<number>([
  0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff, 0x000000,
  0xff8800, 0x88ff00, 0x00ff88, 0x0088ff, 0x8800ff, 0xff0088,
]);

export function rarityOf(hex: number): Rarity {
  const q = quantizeHex(hex);
  if (LEGENDARY_BUCKETS.has(q)) return "legendary";
  const { s, l } = rgbToHsl(q);

  // Epic: extreme saturation + extreme lightness (neons, deep darks)
  if (s > 0.92 && (l > 0.55 || l < 0.32)) return "epic";
  // Rare: very saturated colors
  if (s > 0.78) return "rare";
  // Common: low saturation muddy/gray colors
  if (s < 0.22) return "common";
  // Uncommon: everything else
  return "uncommon";
}

export type ColorInfo = {
  hex: number;
  bucketHex: number;
  bucketId: string;
  name: string;
  rarity: Rarity;
};

export function colorInfo(hex: number): ColorInfo {
  const bucketHex = quantizeHex(hex);
  return {
    hex,
    bucketHex,
    bucketId: bucketHex.toString(16).padStart(6, "0").toUpperCase(),
    name: colorName(hex),
    rarity: rarityOf(hex),
  };
}

// Compute total buckets per rarity (for completion %)
let _rarityTotals: Record<Rarity, number> | null = null;
export function rarityTotals(): Record<Rarity, number> {
  if (_rarityTotals) return _rarityTotals;
  const counts: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  const stepValues: number[] = [];
  for (let i = 0; i < STEPS; i++) stepValues.push(Math.round((i / (STEPS - 1)) * 255));
  for (const r of stepValues) for (const g of stepValues) for (const b of stepValues) {
    counts[rarityOf((r << 16) | (g << 8) | b)]++;
  }
  _rarityTotals = counts;
  return counts;
}

export function rgbDistance(a: number, b: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}
