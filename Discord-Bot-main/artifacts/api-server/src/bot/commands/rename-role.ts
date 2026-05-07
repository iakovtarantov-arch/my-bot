import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { loadData } from "../store";

export const data = new SlashCommandBuilder()
  .setName("rename-role")
  .setDescription("Rename your personal role")
  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription("New name for your role (max 100 characters)")
      .setRequired(true)
      .setMaxLength(100)
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

  const newName = interaction.options.getString("name", true).trim();

  await interaction.deferReply();
  await role.setName(newName, "User renamed their role via /rename-role");

  await interaction.editReply(`✏️ Your role has been renamed to **${newName}**!`);
}
