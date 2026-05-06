import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  User,
} from "discord.js";
import { getDiscovered } from "../store";
import {
  TOTAL_BUCKETS,
  ALL_RARITIES,
  RARITY_INFO,
  Rarity,
  rarityOf,
  colorName,
  hexFromBucketId,
  formatHex,
  rarityTotals,
} from "../color-naming";

export const data = new SlashCommandBuilder()
  .setName("color-dex")
  .setDescription("View your color collection")
  .addUserOption(opt =>
    opt.setName("compare").setDescription("Compare your collection with another user").setRequired(false),
  );

const PAGE_SIZE = 12;
const RARITY_RANK: Record<Rarity, number> = {
  legendary: 4, epic: 3, rare: 2, uncommon: 1, common: 0,
};

function buildOverview(user: User): { embed: EmbedBuilder; components: ActionRowBuilder<ButtonBuilder>[] } {
  const ids = getDiscovered(user.id);
  const totals = rarityTotals();
  const counts: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  for (const id of ids) counts[rarityOf(hexFromBucketId(id))]++;

  const totalDiscovered = ids.length;
  const pct = ((totalDiscovered / TOTAL_BUCKETS) * 100).toFixed(1);
  const filled = Math.round((totalDiscovered / TOTAL_BUCKETS) * 20);
  const bar = "█".repeat(filled) + "░".repeat(20 - filled);

  const recentIds = ids.slice(-5).reverse();
  const recentText = recentIds.length === 0
    ? "*No colors discovered yet — use any color command to start!*"
    : recentIds.map(id => {
        const hex = hexFromBucketId(id);
        const info = RARITY_INFO[rarityOf(hex)];
        return `${info.emoji} \`#${id}\` **${colorName(hex)}**`;
      }).join("\n");

  const rarityLines = ALL_RARITIES.map(r => {
    const info = RARITY_INFO[r];
    const have = counts[r];
    const total = totals[r];
    const rPct = total > 0 ? ((have / total) * 100).toFixed(0) : "0";
    return `${info.emoji} **${info.label}**: ${have} / ${total} *(${rPct}%)*`;
  }).join("\n");

  const embed = new EmbedBuilder()
    .setTitle(`🎨 ${user.username}'s Color Dex`)
    .setColor(totalDiscovered > 0 ? hexFromBucketId(ids[ids.length - 1]!) : 0x5865f2)
    .setDescription(
      `**Discovered:** ${totalDiscovered} / ${TOTAL_BUCKETS} *(${pct}%)*\n` +
      `\`${bar}\`\n\n` +
      `**By Rarity:**\n${rarityLines}\n\n` +
      `**Recent Discoveries:**\n${recentText}`,
    )
    .setFooter({ text: "Tip: every color you set, roll, mix, or steal gets added to your dex." });

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`dex:browse:${user.id}:all:0`).setLabel("Browse All").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`dex:browse:${user.id}:legendary:0`).setLabel("🌟 Legendary").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dex:browse:${user.id}:epic:0`).setLabel("🟣 Epic").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dex:browse:${user.id}:rare:0`).setLabel("🔵 Rare").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dex:overview:${user.id}`).setLabel("🔄").setStyle(ButtonStyle.Secondary),
  );
  return { embed, components: [navRow] };
}

function buildBrowse(user: User, filter: string, page: number): { embed: EmbedBuilder; components: ActionRowBuilder<ButtonBuilder>[] } {
  const ids = getDiscovered(user.id).slice().reverse(); // newest first
  let filtered = ids;
  if (filter !== "all") {
    filtered = ids.filter(id => rarityOf(hexFromBucketId(id)) === filter);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);

  const filterLabel = filter === "all" ? "All" : RARITY_INFO[filter as Rarity].label;
  const filterEmoji = filter === "all" ? "📖" : RARITY_INFO[filter as Rarity].emoji;

  const lines = slice.length === 0
    ? "*No colors of this rarity discovered yet.*"
    : slice.map(id => {
        const hex = hexFromBucketId(id);
        const r = rarityOf(hex);
        return `${RARITY_INFO[r].emoji} \`#${id}\` **${colorName(hex)}**`;
      }).join("\n");

  const embed = new EmbedBuilder()
    .setTitle(`${filterEmoji} ${user.username}'s Dex — ${filterLabel}`)
    .setColor(slice[0] ? hexFromBucketId(slice[0]) : 0x5865f2)
    .setDescription(lines)
    .setFooter({ text: `Page ${safePage + 1} / ${totalPages} • ${filtered.length} entries` });

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`dex:browse:${user.id}:${filter}:${safePage - 1}`).setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(safePage === 0),
    new ButtonBuilder().setCustomId(`dex:overview:${user.id}`).setLabel("🏠 Overview").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`dex:browse:${user.id}:${filter}:${safePage + 1}`).setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(safePage >= totalPages - 1),
  );

  const filterRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`dex:browse:${user.id}:all:0`).setLabel("All").setStyle(filter === "all" ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dex:browse:${user.id}:legendary:0`).setLabel("🌟").setStyle(filter === "legendary" ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dex:browse:${user.id}:epic:0`).setLabel("🟣").setStyle(filter === "epic" ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dex:browse:${user.id}:rare:0`).setLabel("🔵").setStyle(filter === "rare" ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dex:browse:${user.id}:uncommon:0`).setLabel("🟢").setStyle(filter === "uncommon" ? ButtonStyle.Success : ButtonStyle.Secondary),
  );

  return { embed, components: [filterRow, navRow] };
}

function buildCompare(self: User, other: User): EmbedBuilder {
  const myIds = new Set(getDiscovered(self.id));
  const theirIds = new Set(getDiscovered(other.id));
  const shared = [...myIds].filter(id => theirIds.has(id));
  const onlyMe = [...myIds].filter(id => !theirIds.has(id));
  const onlyThem = [...theirIds].filter(id => !myIds.has(id));

  return new EmbedBuilder()
    .setTitle(`🆚 ${self.username} vs ${other.username}`)
    .setColor(0x5865f2)
    .setDescription(
      `🤝 **Shared:** ${shared.length} colors\n` +
      `🟦 **Only ${self.username}:** ${onlyMe.length} colors\n` +
      `🟥 **Only ${other.username}:** ${onlyThem.length} colors\n\n` +
      `${self.username}: **${myIds.size}** / ${TOTAL_BUCKETS}\n` +
      `${other.username}: **${theirIds.size}** / ${TOTAL_BUCKETS}`,
    );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const compareUser = interaction.options.getUser("compare");
  if (compareUser) {
    if (compareUser.id === interaction.user.id) {
      await interaction.reply({ content: "Pick someone other than yourself to compare with.", ephemeral: true });
      return;
    }
    const embed = buildCompare(interaction.user, compareUser);
    await interaction.reply({ embeds: [embed] });
    return;
  }
  const { embed, components } = buildOverview(interaction.user);
  await interaction.reply({ embeds: [embed], components });
}

export async function handleButton(interaction: ButtonInteraction) {
  const parts = interaction.customId.split(":");
  if (parts[0] !== "dex") return;
  const action = parts[1];
  const ownerId = parts[2]!;

  if (interaction.user.id !== ownerId) {
    await interaction.reply({ content: "Use `/color-dex` to view your own collection.", ephemeral: true });
    return;
  }

  // Resolve the owner User object (the clicker IS the owner here)
  const ownerUser = interaction.user;

  if (action === "overview") {
    const { embed, components } = buildOverview(ownerUser);
    await interaction.update({ embeds: [embed], components });
    return;
  }
  if (action === "browse") {
    const filter = parts[3] ?? "all";
    const page = parseInt(parts[4] ?? "0", 10);
    const { embed, components } = buildBrowse(ownerUser, filter, page);
    await interaction.update({ embeds: [embed], components });
    return;
  }
}