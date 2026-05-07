import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import { loadData, saveData } from "../store";

export const data = new SlashCommandBuilder()
  .setName("delete-role")
  .setDescription("Delete your personal role");

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
    await interaction.reply({ content: "You don't have a personal role to delete.", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const role = guild.roles.cache.get(roleId);

  if (role) {
    const member = interaction.member as GuildMember;
    await member.roles.remove(role).catch(() => null);
    await role.delete("User deleted their personal role via /delete-role").catch(() => null);
  }

  delete roleMap[userId];
  saveData(roleMap);

  await interaction.editReply("🗑️ Your personal role has been deleted. You can use `/create-role` again to get a new one.");
}
