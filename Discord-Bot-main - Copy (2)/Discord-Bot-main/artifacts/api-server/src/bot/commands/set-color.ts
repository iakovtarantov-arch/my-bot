import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { loadData, pushColorHistory, getDiscovered } from "../store";
import { colorInfo, RARITY_INFO, bucketId } from "../color-naming";
import { checkAndAnnounceBadges } from "../badges";

export const data = new SlashCommandBuilder()
  .setName("set-color")
  .setDescription("Set your role to a hex color you've already discovered (e.g. #22FFBB)")
  .addStringOption((option) =>
    option
      .setName("hex")
      .setDescription("A hex color code like #22FFBB")
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
  const roleId = roleMap[userId];

  if (!roleId) {
    await interaction.reply({ content: "You don't have a personal role yet. Use `/create-role` first!", ephemeral: true });
    return;
  }

  const role = guild.roles.cache.get(roleId);
  if (!role) {
    await interaction.reply({ content: "Your role no longer exists in this server.", ephemeral: true });
    return;
  }

  const rawValue = interaction.options.getString("hex", true).trim().replace(/^#/, "");

  if (!/^[0-9a-fA-F]{6}$/.test(rawValue)) {
    await interaction.reply({ content: "Invalid hex code. Use a format like `#22FFBB`.", ephemeral: true });
    return;
  }

  const colorNum = parseInt(rawValue, 16);
  const bucket = bucketId(colorNum);
  const discovered = getDiscovered(userId);

  if (!discovered.includes(bucket)) {
    await interaction.reply({ content: `You haven't discovered this color yet! Use \`/random-color\`, \`/mix\`, or \`/color-duel\` to find new colors.`, ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const oldColor = role.color;
  await role.edit({ color: colorNum });

  if (oldColor !== 0) {
    pushColorHistory(userId, oldColor);
  }

  const hexStr = `#${colorNum.toString(16).padStart(6, "0").toUpperCase()}`;
  const info = colorInfo(colorNum);
  const rInfo = RARITY_INFO[info.rarity];

  await interaction.editReply(
    `🎨 Your role color is now \`${hexStr}\` — **${info.name}** ${rInfo.emoji} *${rInfo.label}*`,
  );
  await checkAndAnnounceBadges(interaction, userId);
}