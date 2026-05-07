import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getDiscovered, getStats, getAllDiscovered } from "../store";
import {
  ALL_RARITIES,
  RARITY_INFO,
  Rarity,
  rarityOf,
  rarityTotals,
  hexFromBucketId,
  rgbToHsl,
  pickSector,
  HUE_FAMILY_NAMES,
  TOTAL_BUCKETS,
  formatHex,
  colorName,
} from "../color-naming";

export const data = new SlashCommandBuilder()
  .setName("dex-stats")
  .setDescription("Personal stats and color insights from your dex")
  .addUserOption(opt =>
    opt.setName("user").setDescription("View someone else's dex stats").setRequired(false),
  );

function bar(current: number, total: number, width = 14): string {
  const ratio = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
  const filled = Math.round(ratio * width);
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("user") ?? interaction.user;
  const discovered = getDiscovered(target.id);
  const stats = getStats(target.id);

  if (discovered.length === 0) {
    await interaction.reply({
      content: `${target.id === interaction.user.id ? "You haven't" : `**${target.username}** hasn't`} discovered any colors yet. Try \`/random-color\`!`,
      ephemeral: true,
    });
    return;
  }

  // Rarity counts
  const rarityCounts: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  // Hue counts
  const hueCounts: number[] = new Array(12).fill(0);
  let grayCount = 0;
  let brownCount = 0;
  // HSL aggregates
  let satSum = 0;
  let lightSum = 0;
  // Warm vs cool (warm = sectors 0-3 + 11; cool = 4-10)
  let warm = 0;
  let cool = 0;
  // Rarest
  let rarest: { id: string; rank: number } | null = null;

  for (const id of discovered) {
    const hex = hexFromBucketId(id);
    const r = rarityOf(hex);
    rarityCounts[r]++;
    const { h, s, l } = rgbToHsl(hex);
    satSum += s;
    lightSum += l;
    const sec = pickSector(h, s, l);
    if (sec === -1) grayCount++;
    else if (sec === -2) brownCount++;
    else {
      hueCounts[sec]!++;
      if (sec <= 3 || sec === 11) warm++;
      else cool++;
    }
    if (!rarest || RARITY_INFO[r].rank > rarest.rank) {
      rarest = { id, rank: RARITY_INFO[r].rank };
    }
  }

  const totals = rarityTotals();
  const total = discovered.length;
  const avgSat = (satSum / total) * 100;
  const avgLight = (lightSum / total) * 100;

  // Server percentile
  const all = getAllDiscovered();
  const myCount = total;
  const everyone = Object.values(all).map(a => a.length).filter(n => n > 0);
  const beat = everyone.filter(n => n < myCount).length;
  const percentile = everyone.length > 1 ? Math.round((beat / (everyone.length - 1)) * 100) : 100;

  // Top hue family
  let topHueIdx = 0;
  for (let i = 1; i < 12; i++) if (hueCounts[i]! > hueCounts[topHueIdx]!) topHueIdx = i;
  const topHueName = hueCounts[topHueIdx]! > 0 ? HUE_FAMILY_NAMES[topHueIdx]! : "—";

  // Rarity breakdown lines
  const rarityLines = ALL_RARITIES.map(r => {
    const count = rarityCounts[r];
    const pool = totals[r];
    const info = RARITY_INFO[r];
    return `${info.emoji} **${info.label}** \`${bar(count, pool)}\` ${count} / ${pool}`;
  });

  // Rarest discovered
  const rarestHex = rarest ? hexFromBucketId(rarest.id) : null;
  const rarestStr = rarestHex !== null
    ? `${RARITY_INFO[rarityOf(rarestHex)].emoji} **${colorName(rarestHex)}** \`${formatHex(rarestHex)}\``
    : "—";

  // Fun facts — pick the most interesting based on the data
  const facts: string[] = [];

  if (avgSat > 65) facts.push(`🌶️ Your dex is **bold** — average saturation ${avgSat.toFixed(0)}%, well above the spectrum mean.`);
  else if (avgSat < 30) facts.push(`🌫️ Your dex is **muted** — average saturation only ${avgSat.toFixed(0)}%. A subtle eye.`);

  if (avgLight > 65) facts.push(`☀️ You skew **bright** — your average lightness is ${avgLight.toFixed(0)}%.`);
  else if (avgLight < 35) facts.push(`🌙 You skew **dark** — your average lightness is only ${avgLight.toFixed(0)}%.`);

  if (warm + cool > 0) {
    const warmPct = Math.round((warm / (warm + cool)) * 100);
    if (warmPct >= 65) facts.push(`🔥 **${warmPct}%** of your colors are *warm* (reds, oranges, yellows, pinks). A fire collector.`);
    else if (warmPct <= 35) facts.push(`❄️ **${100 - warmPct}%** of your colors are *cool* (greens, blues, violets). An ocean soul.`);
    else facts.push(`⚖️ Your warm/cool balance is **${warmPct}/${100 - warmPct}** — perfectly tempered.`);
  }

  if (grayCount > total * 0.25) facts.push(`🪨 **${grayCount}** of your colors are pure grays/blacks/whites. A monochrome hoarder.`);
  if (brownCount > total * 0.15) facts.push(`☕ You've collected **${brownCount}** earthy browns — autumn vibes.`);

  if (rarityCounts.legendary >= 3) facts.push(`🌟 **${rarityCounts.legendary}** Legendaries owned. You're chasing the meta.`);
  if (rarityCounts.epic > rarityCounts.uncommon && rarityCounts.epic > 5) {
    facts.push(`💜 You have *more Epics than Uncommons* (${rarityCounts.epic} > ${rarityCounts.uncommon}). The neon hunter archetype.`);
  }

  if (hueCounts[topHueIdx]! > 0) {
    facts.push(`🎨 Your favorite hue family is **${topHueName}** (${hueCounts[topHueIdx]} colors).`);
  }

  if (stats.mixDiscoveries >= 5) facts.push(`🧪 You've found **${stats.mixDiscoveries}** colors via \`/mix\` — a true mixologist.`);
  if (stats.stealDiscoveries >= 5) facts.push(`👁️ **${stats.stealDiscoveries}** colors stolen from others. Sticky fingers.`);
  if (stats.duelWins >= 3) facts.push(`⚔️ **${stats.duelWins}** duel wins. The arena fears you.`);

  if (everyone.length > 1) facts.push(`📊 You've discovered more colors than **${percentile}%** of collectors here.`);

  // Random color trivia tied to the user's stats
  const completion = (total / TOTAL_BUCKETS) * 100;
  if (completion < 1) facts.push(`🌱 You're at **${completion.toFixed(2)}%** of the full dex — the journey has barely begun.`);
  else if (completion < 10) facts.push(`📈 **${completion.toFixed(1)}%** dex completion — solidly past beginner.`);
  else if (completion < 50) facts.push(`🚀 **${completion.toFixed(1)}%** dex completion — serious collector territory.`);
  else if (completion < 95) facts.push(`👑 **${completion.toFixed(1)}%** dex completion — a true color connoisseur.`);
  else facts.push(`🏆 **${completion.toFixed(1)}%** dex completion — almost legendary.`);

  // Pick top 6 facts to keep embed tidy
  const factText = facts.slice(0, 6).map(f => `• ${f}`).join("\n");

  const embedColor = rarestHex ?? 0x5865f2;

  const embed = new EmbedBuilder()
    .setTitle(`📊 Dex Stats — ${target.username}`)
    .setColor(embedColor)
    .setDescription(
      `**Total discovered:** ${total} / ${TOTAL_BUCKETS}  *(${completion.toFixed(2)}%)*\n` +
      `**Rarest in dex:** ${rarestStr}\n` +
      `**Favorite hue family:** ${topHueName}`,
    )
    .addFields(
      { name: "Rarity Breakdown", value: rarityLines.join("\n") },
      { name: "Color DNA", value:
        `🎚️ Avg Saturation: **${avgSat.toFixed(0)}%**\n` +
        `💡 Avg Lightness: **${avgLight.toFixed(0)}%**\n` +
        `🔥 Warm: **${warm}**  ❄️ Cool: **${cool}**  🪨 Gray: **${grayCount}**  ☕ Brown: **${brownCount}**`,
      },
      { name: "Activity", value:
        `🧪 Mix discoveries: **${stats.mixDiscoveries}**\n` +
        `👁️ Steal discoveries: **${stats.stealDiscoveries}**\n` +
        `⚔️ Duels won: **${stats.duelWins}**`,
      },
      { name: "Color Insights", value: factText || "*Discover more colors to unlock insights!*" },
    );

  await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
}