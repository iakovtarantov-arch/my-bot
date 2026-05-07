import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { getAllDiscovered } from "../store";
import {
  ALL_RARITIES,
  RARITY_INFO,
  Rarity,
  rarityOf,
  hexFromBucketId,
  TOTAL_BUCKETS,
  rarityTotals,
} from "../color-naming";

type Category = "total" | "legendary" | "epic" | "rare";

const CATEGORY_INFO: Record<Category, { label: string; emoji: string; color: number }> = {
  total:     { label: "Total Discovered", emoji: "🏆", color: 0xf1c40f },
  legendary: { label: "Legendaries",      emoji: "🌟", color: RARITY_INFO.legendary.color },
  epic:      { label: "Epics",            emoji: "🟣", color: RARITY_INFO.epic.color },
  rare:      { label: "Rares",            emoji: "🔵", color: RARITY_INFO.rare.color },
};

export const data = new SlashCommandBuilder()
  .setName("dex-leaderboard")
  .setDescription("See who's collected the most colors in this server");

function computeRanking(category: Category): { userId: string; score: number; total: number }[] {
  const all = getAllDiscovered();
  const rows: { userId: string; score: number; total: number }[] = [];
  for (const [userId, ids] of Object.entries(all)) {
    if (!ids || ids.length === 0) continue;
    let score: number;
    if (category === "total") {
      score = ids.length;
    } else {
      score = ids.filter(id => rarityOf(hexFromBucketId(id)) === category).length;
    }
    rows.push({ userId, score, total: ids.length });
  }
  rows.sort((a, b) => b.score - a.score);
  return rows;
}

function buildEmbed(category: Category): EmbedBuilder {
  const info = CATEGORY_INFO[category];
  const ranking = computeRanking(category);
  const top = ranking.slice(0, 10);
  const totalForCategory = category === "total"
    ? TOTAL_BUCKETS
    : rarityTotals()[category as Rarity];

  const medals = ["🥇", "🥈", "🥉"];
  const lines = top.length === 0
    ? "*No collectors yet — be the first!*"
    : top.map((row, i) => {
        const place = medals[i] ?? `\`#${i + 1}\``;
        const pct = ((row.score / totalForCategory) * 100).toFixed(1);
        return `${place} <@${row.userId}> — **${row.score}** / ${totalForCategory} *(${pct}%)*`;
      }).join("\n");

  return new EmbedBuilder()
    .setTitle(`${info.emoji} Color Dex Leaderboard — ${info.label}`)
    .setColor(info.color)
    .setDescription(lines)
    .setFooter({ text: `${ranking.length} collector(s) tracked` });
}

function buildButtons(active: Category): ActionRowBuilder<ButtonBuilder> {
  const cats: Category[] = ["total", "legendary", "epic", "rare"];
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    cats.map(c =>
      new ButtonBuilder()
        .setCustomId(`lb:${c}`)
        .setLabel(`${CATEGORY_INFO[c].emoji} ${CATEGORY_INFO[c].label}`)
        .setStyle(c === active ? ButtonStyle.Success : ButtonStyle.Secondary),
    ),
  );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply({
    embeds: [buildEmbed("total")],
    components: [buildButtons("total")],
    allowedMentions: { parse: [] },
  });
}

export async function handleButton(interaction: ButtonInteraction) {
  const parts = interaction.customId.split(":");
  if (parts[0] !== "lb") return;
  const category = parts[1] as Category;
  if (!CATEGORY_INFO[category]) return;
  await interaction.update({
    embeds: [buildEmbed(category)],
    components: [buildButtons(category)],
    allowedMentions: { parse: [] },
  });
}