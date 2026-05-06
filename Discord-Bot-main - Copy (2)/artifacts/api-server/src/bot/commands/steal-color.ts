import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { loadData, pushColorHistory, discoverColor } from "../store";
import { colorInfo, RARITY_INFO } from "../color-naming";
import { checkAndAnnounceBadges } from "../badges";

export const data = new SlashCommandBuilder()
  .setName("steal-color")
  .setDescription("Copy another user's role color onto your own")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("The user whose color you want to steal")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const roleMap = loadData();
  const userId = interaction.user.id;
  const myRoleId = roleMap[userId];

  if (!myRoleId) {
    await interaction.reply({ content: "You don't have a personal role yet. Use `/create-role` first!", ephemeral: true });
    return;
  }

  const myRole = guild.roles.cache.get(myRoleId);
  if (!myRole) {
    await interaction.reply({ content: "Your role no longer exists in this server.", ephemeral: true });
    return;
  }

  const target = interaction.options.getUser("user", true);

  if (target.id === userId) {
    await interaction.reply({ content: "You can't steal your own color!", ephemeral: true });
    return;
  }

  const targetRoleId = roleMap[target.id];
  if (!targetRoleId) {
    await interaction.reply({ content: `**${target.displayName}** doesn't have a personal role yet.`, ephemeral: true });
    return;
  }

  const targetRole = guild.roles.cache.get(targetRoleId);
  if (!targetRole) {
    await interaction.reply({ content: `**${target.displayName}'s** role no longer exists in this server.`, ephemeral: true });
    return;
  }

  if (targetRole.color === 0) {
    await interaction.reply({ content: `**${target.displayName}** doesn't have a color set on their role yet.`, ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const stolenColor = targetRole.color;
  const oldColor = myRole.color;

  await myRole.edit({ color: stolenColor });

  if (oldColor !== 0) {
    pushColorHistory(userId, oldColor);
  }

  const hexStr = `#${stolenColor.toString(16).padStart(6, "0").toUpperCase()}`;
  const info = colorInfo(stolenColor);
  const isNew = discoverColor(userId, stolenColor, "steal");
  const rInfo = RARITY_INFO[info.rarity];
  const newTag = isNew ? `\n✨ **NEW DISCOVERY!**` : "";
  await interaction.editReply(
    `🥷 Stole **${target.displayName}'s** color \`${hexStr}\` — **${info.name}** ${rInfo.emoji} *${rInfo.label}*${newTag}`,
  );
  await checkAndAnnounceBadges(interaction, userId);
}
