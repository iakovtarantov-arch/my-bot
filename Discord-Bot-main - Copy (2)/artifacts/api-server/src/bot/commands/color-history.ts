import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { loadData, getColorHistory, pushColorHistory, discoverColor } from "../store";
import { checkAndAnnounceBadges } from "../badges";

export const data = new SlashCommandBuilder()
  .setName("color-history")
  .setDescription("View or revert to a previous role color")
  .addIntegerOption((option) =>
    option
      .setName("revert")
      .setDescription("Revert to a color by its number in the list (e.g. 1 for most recent)")
      .setMinValue(1)
      .setMaxValue(10)
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

  const history = getColorHistory(userId);

  if (history.length === 0) {
    await interaction.reply({ content: "No color history yet. Use `/random-color` a few times first!", ephemeral: true });
    return;
  }

  const revertIndex = interaction.options.getInteger("revert");

  if (revertIndex !== null) {
    const target = history[revertIndex - 1];
    if (target === undefined) {
      await interaction.reply({ content: `No color at position ${revertIndex}. You only have ${history.length} color(s) in history.`, ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const oldColor = role.color;
    await role.edit({ color: target });

    if (oldColor !== 0) {
      pushColorHistory(userId, oldColor);
    }
    discoverColor(userId, target, "history");

    const hexString = `#${target.toString(16).padStart(6, "0").toUpperCase()}`;
    await interaction.editReply(`↩️ Reverted **${role.name}** back to \`${hexString}\`!`);
    await checkAndAnnounceBadges(interaction, userId);
    return;
  }

  const lines = history.map((color, i) => {
    const hex = `#${color.toString(16).padStart(6, "0").toUpperCase()}`;
    return `\`${i + 1}.\` \`${hex}\``;
  });

  const embed = new EmbedBuilder()
    .setColor(role.color || 0x5865f2)
    .setTitle("Your Color History")
    .setDescription(lines.join("\n"))
    .setFooter({ text: "Use /color-history revert:<number> to restore a color" });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
