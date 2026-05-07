import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { loadData } from "../store";

export const data = new SlashCommandBuilder()
  .setName("roleboard")
  .setDescription("Show everyone's personal role and their current color");

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const roleMap = loadData();
  const entries = Object.entries(roleMap);

  if (entries.length === 0) {
    await interaction.editReply("No one has a personal role yet. Be the first with `/create-role`!");
    return;
  }

  const lines: string[] = [];

  for (const [userId, roleId] of entries) {
    const role = guild.roles.cache.get(roleId);
    if (!role) continue;

    const hexStr = role.color !== 0
      ? `\`#${role.color.toString(16).padStart(6, "0").toUpperCase()}\``
      : "`no color`";

    lines.push(`<@&${roleId}> — <@${userId}> ${hexStr}`);
  }

  if (lines.length === 0) {
    await interaction.editReply("No active personal roles found in this server.");
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎨 Role Board")
    .setDescription(lines.join("\n"))
    .setFooter({ text: `${lines.length} personal role${lines.length === 1 ? "" : "s"} • Use /random-color or /set-color to change yours` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
