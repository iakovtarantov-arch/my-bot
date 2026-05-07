import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { bucketId } from "./color-naming";

const DATA_FILE = join(dirname(fileURLToPath(import.meta.url)), "../../roles.json");

const MAX_HISTORY = 10;

export type DiscoverySource = "roll" | "set" | "steal" | "mix" | "duel" | "history" | "create";

export type UserStats = {
  mixDiscoveries: number;
  stealDiscoveries: number;
  duelWins: number;
};

const EMPTY_STATS = (): UserStats => ({ mixDiscoveries: 0, stealDiscoveries: 0, duelWins: 0 });

type StoreData = {
  roles: Record<string, string>;
  history: Record<string, number[]>;
  discovered: Record<string, string[]>;
  stats: Record<string, UserStats>;
  badges: Record<string, string[]>;
};

function loadRaw(): StoreData {
  const empty: StoreData = { roles: {}, history: {}, discovered: {}, stats: {}, badges: {} };
  if (!existsSync(DATA_FILE)) return empty;
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
    if (parsed.roles) {
      return {
        roles: parsed.roles,
        history: parsed.history ?? {},
        discovered: parsed.discovered ?? {},
        stats: parsed.stats ?? {},
        badges: parsed.badges ?? {},
      };
    }
    return { ...empty, roles: parsed as Record<string, string> };
  } catch {
    return empty;
  }
}

function saveRaw(data: StoreData): void {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export type RoleMap = Record<string, string>;

export function loadData(): RoleMap {
  return loadRaw().roles;
}

export function saveData(roles: RoleMap): void {
  const data = loadRaw();
  data.roles = roles;
  saveRaw(data);
}

export function getColorHistory(userId: string): number[] {
  return loadRaw().history[userId] ?? [];
}

export function pushColorHistory(userId: string, color: number): void {
  const data = loadRaw();
  const hist = data.history[userId] ?? [];
  hist.unshift(color);
  data.history[userId] = hist.slice(0, MAX_HISTORY);
  saveRaw(data);
}

export function getDiscovered(userId: string): string[] {
  return loadRaw().discovered[userId] ?? [];
}

export function getAllDiscovered(): Record<string, string[]> {
  return loadRaw().discovered;
}

/** Records a color in the user's dex. Returns true if it's a NEW discovery.
 *  When `source` is "mix" or "steal" and the discovery is new, the matching
 *  per-source counter is bumped (used by badges). */
export function discoverColor(userId: string, hex: number, source: DiscoverySource = "roll"): boolean {
  const id = bucketId(hex);
  const data = loadRaw();
  const list = data.discovered[userId] ?? [];
  if (list.includes(id)) return false;
  list.push(id);
  data.discovered[userId] = list;

  if (source === "mix" || source === "steal") {
    const stats = data.stats[userId] ?? EMPTY_STATS();
    if (source === "mix") stats.mixDiscoveries++;
    if (source === "steal") stats.stealDiscoveries++;
    data.stats[userId] = stats;
  }

  saveRaw(data);
  return true;
}

export function getStats(userId: string): UserStats {
  const s = loadRaw().stats[userId];
  return s ? { ...EMPTY_STATS(), ...s } : EMPTY_STATS();
}

export function recordDuelWin(userId: string): void {
  const data = loadRaw();
  const stats = data.stats[userId] ?? EMPTY_STATS();
  stats.duelWins++;
  data.stats[userId] = stats;
  saveRaw(data);
}

export function getBadges(userId: string): string[] {
  return loadRaw().badges[userId] ?? [];
}

export function setBadges(userId: string, badgeIds: string[]): void {
  const data = loadRaw();
  data.badges[userId] = badgeIds;
  saveRaw(data);
}
