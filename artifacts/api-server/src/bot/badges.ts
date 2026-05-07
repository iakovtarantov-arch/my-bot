import { Guild, GuildMember, ChatInputCommandInteraction, ButtonInteraction } from "discord.js";
import {
  hexFromBucketId,
  rgbToHsl,
  pickSector,
  rarityOf,
  PURE_PRIMARY_BUCKETS,
  RAINBOW_SECTORS,
  bucketId,
} from "./color-naming";
import { getDiscovered, getStats, getBadges, setBadges, UserStats } from "./store";
import { logger } from "../lib/logger";

export type BadgeCtx = {
  discovered: string[];
  stats: UserStats;
};

export type BadgeDef = {
  id: string;          // also used as the Discord role name
  name: string;        // display label (matches role name)
  emoji: string;
  description: string;
  progress: (ctx: BadgeCtx) => { current: number; target: number };
};

function countByRarity(discovered: string[], rarity: "common" | "rare" | "epic" | "legendary" | "uncommon"): number {
  let n = 0;
  for (const id of discovered) if (rarityOf(hexFromBucketId(id)) === rarity) n++;
  return n;
}

function uniqueSectors(discovered: string[]): Set<number> {
  const set = new Set<number>();
  for (const id of discovered) {
    const { h, s, l } = rgbToHsl(hexFromBucketId(id));
    const sec = pickSector(h, s, l);
    if (sec >= 0) set.add(sec);
  }
  return set;
}

function countPurePrimaries(discovered: string[]): number {
  const owned = new Set(discovered);
  let n = 0;
  for (const hex of PURE_PRIMARY_BUCKETS) if (owned.has(bucketId(hex))) n++;
  return n;
}

export const BADGE_DEFS: BadgeDef[] = [
  {
    id: "Rainbow Rider",
    name: "Rainbow Rider",
    emoji: "🌈",
    description: "Discover at least one color from each of the 6 rainbow families",
    progress: ({ discovered }) => {
      const owned = uniqueSectors(discovered);
      const have = RAINBOW_SECTORS.filter(s => owned.has(s)).length;
      return { current: have, target: RAINBOW_SECTORS.length };
    },
  },
  {
    id: "Spectrum Scholar",
    name: "Spectrum Scholar",
    emoji: "🎓",
    description: "Discover at least one color from every one of the 12 hue families",
    progress: ({ discovered }) => ({ current: uniqueSectors(discovered).size, target: 12 }),
  },
  {
    id: "Pure Heart",
    name: "Pure Heart",
    emoji: "💎",
    description: "Discover all 8 pure-primary colors (red/green/blue/yellow/magenta/cyan/white/black)",
    progress: ({ discovered }) => ({ current: countPurePrimaries(discovered), target: 8 }),
  },
  {
    id: "Centurion",
    name: "Centurion",
    emoji: "💯",
    description: "Discover 100 unique colors",
    progress: ({ discovered }) => ({ current: discovered.length, target: 100 }),
  },
  {
    id: "Half-Dex",
    name: "Half-Dex",
    emoji: "📖",
    description: "Discover 2,048 unique colors (half the dex)",
    progress: ({ discovered }) => ({ current: discovered.length, target: 2048 }),
  },
  {
    id: "Completionist",
    name: "Completionist",
    emoji: "🏆",
    description: "Discover all 4,096 colors",
    progress: ({ discovered }) => ({ current: discovered.length, target: 4096 }),
  },
  {
    id: "Legendary Hunter",
    name: "Legendary Hunter",
    emoji: "🌟",
    description: "Discover 5 Legendary colors",
    progress: ({ discovered }) => ({ current: countByRarity(discovered, "legendary"), target: 5 }),
  },
  {
    id: "Neon Junkie",
    name: "Neon Junkie",
    emoji: "💜",
    description: "Discover 50 Epic colors",
    progress: ({ discovered }) => ({ current: countByRarity(discovered, "epic"), target: 50 }),
  },
  {
    id: "Mud Connoisseur",
    name: "Mud Connoisseur",
    emoji: "🪨",
    description: "Discover 100 Common colors",
    progress: ({ discovered }) => ({ current: countByRarity(discovered, "common"), target: 100 }),
  },
  {
    id: "Mixologist",
    name: "Mixologist",
    emoji: "🧪",
    description: "Discover 25 colors via /mix",
    progress: ({ stats }) => ({ current: stats.mixDiscoveries, target: 25 }),
  },
  {
    id: "Duelist",
    name: "Duelist",
    emoji: "⚔️",
    description: "Win 10 color duels",
    progress: ({ stats }) => ({ current: stats.duelWins, target: 10 }),
  },
  {
    id: "Thief's Eye",
    name: "Thief's Eye",
    emoji: "👁️",
    description: "Discover 25 colors via /steal-color",
    progress: ({ stats }) => ({ current: stats.stealDiscoveries, target: 25 }),
  },
];

export function getBadgeCtx(userId: string): BadgeCtx {
  return { discovered: getDiscovered(userId), stats: getStats(userId) };
}

export function isUnlocked(def: BadgeDef, ctx: BadgeCtx): boolean {
  const p = def.progress(ctx);
  return p.current >= p.target;
}

/** Find or create the Discord role for a badge. Roles are uncolored, non-hoisted,
 *  non-mentionable so they don't override personal color roles. */
async function ensureBadgeRole(guild: Guild, def: BadgeDef) {
  let role = guild.roles.cache.find(r => r.name === def.name);
  if (role) return role;
  try {
    role = await guild.roles.create({
      name: def.name,
      mentionable: false,
      hoist: false,
      permissions: [],
      reason: `Auto-created badge role for ${def.id}`,
    });
    logger.info({ badge: def.id, roleId: role.id }, "Created badge role");
    return role;
  } catch (err) {
    logger.error({ err, badge: def.id }, "Failed to create badge role");
    return null;
  }
}

/** Evaluate all badges for a user. Grants any newly-earned badges (Discord role + persisted),
 *  and returns the list of badges that were just unlocked. */
export async function evaluateBadges(guild: Guild, userId: string): Promise<BadgeDef[]> {
  const ctx = getBadgeCtx(userId);
  const owned = new Set(getBadges(userId));
  const newly: BadgeDef[] = [];

  let member: GuildMember | null = null;
  for (const def of BADGE_DEFS) {
    if (owned.has(def.id)) continue;
    if (!isUnlocked(def, ctx)) continue;

    if (!member) {
      try {
        member = await guild.members.fetch(userId);
      } catch (err) {
        logger.warn({ err, userId }, "Could not fetch member for badge grant");
        return [];
      }
    }
    const role = await ensureBadgeRole(guild, def);
    if (!role) continue;
    try {
      await member.roles.add(role, `Earned badge: ${def.id}`);
      owned.add(def.id);
      newly.push(def);
    } catch (err) {
      logger.error({ err, badge: def.id, userId }, "Failed to assign badge role");
    }
  }

  if (newly.length > 0) setBadges(userId, [...owned]);
  return newly;
}

type AnnounceTarget = ChatInputCommandInteraction | ButtonInteraction;

/** Convenience helper: evaluate badges and post a celebratory followUp for each new one. */
export async function checkAndAnnounceBadges(interaction: AnnounceTarget, userId: string): Promise<void> {
  if (!interaction.guild) return;
  let newly: BadgeDef[];
  try {
    newly = await evaluateBadges(interaction.guild, userId);
  } catch (err) {
    logger.error({ err, userId }, "Badge evaluation failed");
    return;
  }
  for (const b of newly) {
    try {
      await interaction.followUp({
        content: `🎉 <@${userId}> unlocked the **${b.name}** ${b.emoji} badge!\n*${b.description}*`,
        allowedMentions: { users: [userId] },
      });
    } catch (err) {
      logger.warn({ err, badge: b.id }, "Could not post badge unlock message");
    }
  }
}
