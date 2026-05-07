import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
} from "discord.js";
import { loadData, saveData } from "../store";

export const data = new SlashCommandBuilder()
  .setName("create-role")
  .setDescription("Create your own personal role (one per user)");

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const roleMap = loadData();
  const userId = interaction.user.id;

  if (roleMap[userId]) {
    await interaction.reply({ content: "You already have a personal role. Use `/random-color` to change its color!", ephemeral: true });
    return;
  }

  if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({ content: "I don't have permission to manage roles in this server.", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const role = await guild.roles.create({
    name: `${interaction.user.username}'s role`,
    reason: "Personal user role via /create-role",
  });

  const member = interaction.member as GuildMember;
  await member.roles.add(role);

  roleMap[userId] = role.id;
  saveData(roleMap);

  await interaction.editReply(
    `✅ Created and assigned **${role.name}** to you! Use \`/random-color\` to give it a color, \`/rename-role\` to rename it, or \`/delete-role\` to remove it.`
  );
}
