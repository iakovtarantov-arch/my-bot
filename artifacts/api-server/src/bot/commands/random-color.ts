import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { loadData, pushColorHistory, discoverColor } from "../store";
import { colorInfo, RARITY_INFO } from "../color-naming";
import { checkAndAnnounceBadges } from "../badges";

export const data = new SlashCommandBuilder()
  .setName("random-color")
  .setDescription("Assign a random color to your personal role");

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

  await interaction.deferReply();

  const oldColor = role.color;
  const randomHex = Math.floor(Math.random() * 0x1000000);
  await role.edit({ color: randomHex });

  if (oldColor !== 0) {
    pushColorHistory(userId, oldColor);
  }

  const info = colorInfo(randomHex);
  const isNew = discoverColor(userId, randomHex, "roll");
  const rInfo = RARITY_INFO[info.rarity];
  const hexString = `#${randomHex.toString(16).padStart(6, "0").toUpperCase()}`;
  const newTag = isNew ? "\n✨ **NEW DISCOVERY!**" : "";
  await interaction.editReply(
    `🎨 **${role.name}** has been recolored to \`${hexString}\` — **${info.name}** ${rInfo.emoji} *${rInfo.label}*${newTag}`,
  );
  await checkAndAnnounceBadges(interaction, userId);
}
