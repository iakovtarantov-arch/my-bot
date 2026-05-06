import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { loadData } from "../store";

export const data = new SlashCommandBuilder()
  .setName("my-role")
  .setDescription("Show the details of your personal role");

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
    await interaction.reply({ content: "You don't have a personal role yet. Use `/create-role` to get one!", ephemeral: true });
    return;
  }

  const role = guild.roles.cache.get(roleId);
  if (!role) {
    await interaction.reply({ content: "Your role no longer exists in this server.", ephemeral: true });
    return;
  }

  const hexColor = `#${role.color.toString(16).padStart(6, "0").toUpperCase()}`;
  const colorDisplay = role.color === 0 ? "None (default)" : hexColor;

  const embed = new EmbedBuilder()
    .setColor(role.color || 0x5865f2)
    .setTitle("Your Personal Role")
    .addFields(
      { name: "Name", value: role.name, inline: true },
      { name: "Color", value: colorDisplay, inline: true },
      { name: "Members", value: role.members.size.toString(), inline: true },
      { name: "Created", value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
      { name: "Role ID", value: role.id, inline: true },
    )
    .setFooter({ text: "Use /random-color to change color • /rename-role to rename • /delete-role to remove" });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
