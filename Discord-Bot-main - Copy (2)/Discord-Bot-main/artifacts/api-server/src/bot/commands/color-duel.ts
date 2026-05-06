import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { loadData, pushColorHistory, discoverColor, recordDuelWin } from "../store";
import { colorInfo, formatHex, rgbDistance } from "../color-naming";
import { checkAndAnnounceBadges } from "../badges";

type DuelState = {
  targetHex: number;
  targetName: string;
  challenger: { id: string; username: string; roll: number | null };
  opponent: { id: string; username: string; roll: number | null };
  finished: boolean;
};

const duels = new Map<string, DuelState>();

function cleanupDuel(id: string) {
  setTimeout(() => duels.delete(id), 10 * 60 * 1000);
}

export const data = new SlashCommandBuilder()
  .setName("color-duel")
  .setDescription("Challenge another user to a color-rolling duel")
  .addUserOption(opt =>
    opt.setName("user").setDescription("The user to duel").setRequired(true),
  );

function buildEmbed(state: DuelState): EmbedBuilder {
  const tStr = formatHex(state.targetHex);
  const cRoll = state.challenger.roll;
  const oRoll = state.opponent.roll;
  const cStr = cRoll !== null ? formatHex(cRoll) : "*not yet rolled*";
  const oStr = oRoll !== null ? formatHex(oRoll) : "*not yet rolled*";
  const cDist = cRoll !== null ? rgbDistance(state.targetHex, cRoll).toFixed(1) : "—";
  const oDist = oRoll !== null ? rgbDistance(state.targetHex, oRoll).toFixed(1) : "—";

  const embed = new EmbedBuilder()
    .setTitle("⚔️ Color Duel")
    .setColor(state.targetHex)
    .setDescription(
      `**Target Color:** \`${tStr}\` — *${state.targetName}*\n\n` +
      `🟦 **${state.challenger.username}** rolled \`${cStr}\` *(distance: ${cDist})*\n` +
      `🟥 **${state.opponent.username}** rolled \`${oStr}\` *(distance: ${oDist})*`,
    );

  if (state.finished) {
    const cWon = (cRoll !== null && oRoll !== null) &&
      rgbDistance(state.targetHex, cRoll) < rgbDistance(state.targetHex, oRoll);
    const tied = cRoll !== null && oRoll !== null &&
      rgbDistance(state.targetHex, cRoll) === rgbDistance(state.targetHex, oRoll);
    if (tied) {
      embed.addFields({ name: "Result", value: "🤝 **It's a tie!**" });
    } else {
      const winnerName = cWon ? state.challenger.username : state.opponent.username;
      embed.addFields({ name: "Result", value: `🏆 **${winnerName}** wins!` });
    }
  } else {
    embed.setFooter({ text: "Each duelist must click their Roll button below." });
  }
  return embed;
}

function buildButtons(duelId: string, state: DuelState): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`duel:roll:${duelId}:c`)
      .setLabel(`${state.challenger.username} Roll`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(state.challenger.roll !== null || state.finished),
    new ButtonBuilder()
      .setCustomId(`duel:roll:${duelId}:o`)
      .setLabel(`${state.opponent.username} Roll`)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(state.opponent.roll !== null || state.finished),
  );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const opponent = interaction.options.getUser("user", true);
  if (opponent.id === interaction.user.id) {
    await interaction.reply({ content: "You can't duel yourself!", ephemeral: true });
    return;
  }
  if (opponent.bot) {
    await interaction.reply({ content: "You can't duel a bot.", ephemeral: true });
    return;
  }

  const roleMap = loadData();
  if (!roleMap[interaction.user.id]) {
    await interaction.reply({ content: "You don't have a personal role yet. Use `/create-role` first!", ephemeral: true });
    return;
  }
  if (!roleMap[opponent.id]) {
    await interaction.reply({ content: `${opponent.username} doesn't have a personal role.`, ephemeral: true });
    return;
  }

  const targetHex = Math.floor(Math.random() * 0x1000000);
  const targetInfo = colorInfo(targetHex);

  const state: DuelState = {
    targetHex,
    targetName: targetInfo.name,
    challenger: { id: interaction.user.id, username: interaction.user.username, roll: null },
    opponent: { id: opponent.id, username: opponent.username, roll: null },
    finished: false,
  };

  const duelId = interaction.id;
  duels.set(duelId, state);
  cleanupDuel(duelId);

  await interaction.reply({
    content: `${opponent}, you've been challenged to a color duel!`,
    embeds: [buildEmbed(state)],
    components: [buildButtons(duelId, state)],
  });
}

async function applyRollColor(guild: import("discord.js").Guild, userId: string, hex: number) {
  const roleMap = loadData();
  const roleId = roleMap[userId];
  if (!roleId) return;
  const role = guild.roles.cache.get(roleId);
  if (!role) return;
  const oldColor = role.color;
  try {
    await role.edit({ color: hex });
    if (oldColor !== 0) pushColorHistory(userId, oldColor);
    discoverColor(userId, hex, "duel");
  } catch {
    // ignore
  }
}

export async function handleButton(interaction: ButtonInteraction) {
  const parts = interaction.customId.split(":");
  if (parts[0] !== "duel" || parts[1] !== "roll") return;
  const duelId = parts[2]!;
  const side = parts[3]; // "c" or "o"
  const state = duels.get(duelId);
  if (!state) {
    await interaction.reply({ content: "This duel has expired.", ephemeral: true });
    return;
  }

  const isChallenger = side === "c";
  const slot = isChallenger ? state.challenger : state.opponent;
  if (interaction.user.id !== slot.id) {
    await interaction.reply({ content: "This isn't your roll button!", ephemeral: true });
    return;
  }
  if (slot.roll !== null) {
    await interaction.reply({ content: "You already rolled.", ephemeral: true });
    return;
  }

  slot.roll = Math.floor(Math.random() * 0x1000000);

  // If both rolled, finalize
  let winnerId: string | null = null;
  if (state.challenger.roll !== null && state.opponent.roll !== null) {
    state.finished = true;
    const cDist = rgbDistance(state.targetHex, state.challenger.roll);
    const oDist = rgbDistance(state.targetHex, state.opponent.roll);
    if (cDist < oDist) winnerId = state.challenger.id;
    else if (oDist < cDist) winnerId = state.opponent.id;
    if (winnerId) recordDuelWin(winnerId);
    if (interaction.guild) {
      await applyRollColor(interaction.guild, state.challenger.id, state.challenger.roll);
      await applyRollColor(interaction.guild, state.opponent.id, state.opponent.roll);
    }
  }

  await interaction.update({
    embeds: [buildEmbed(state)],
    components: [buildButtons(duelId, state)],
  });

  if (state.finished) {
    await checkAndAnnounceBadges(interaction, state.challenger.id);
    await checkAndAnnounceBadges(interaction, state.opponent.id);
  }
}
