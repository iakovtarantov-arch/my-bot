import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { loadData, pushColorHistory, discoverColor } from "../store";
import { colorInfo, RARITY_INFO } from "../color-naming";
import { checkAndAnnounceBadges } from "../badges";

export const data = new SlashCommandBuilder()
  .setName("mix")
  .setDescription("Mix your role color with another user's (own first half + their second half)")
  .addUserOption(opt =>
    opt.setName("user").setDescription("The user to mix colors with").setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const target = interaction.options.getUser("user", true);
  if (target.id === interaction.user.id) {
    await interaction.reply({ content: "You can't mix with yourself!", ephemeral: true });
    return;
  }

  const roleMap = loadData();
  const myRoleId = roleMap[interaction.user.id];
  const theirRoleId = roleMap[target.id];

  if (!myRoleId) {
    await interaction.reply({ content: "You don't have a personal role yet. Use `/create-role` first!", ephemeral: true });
    return;
  }
  if (!theirRoleId) {
    await interaction.reply({ content: `${target.username} doesn't have a personal role to mix with.`, ephemeral: true });
    return;
  }

  const myRole = guild.roles.cache.get(myRoleId);
  const theirRole = guild.roles.cache.get(theirRoleId);
  if (!myRole || !theirRole) {
    await interaction.reply({ content: "One of the roles no longer exists.", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const myHex = myRole.color;
  const theirHex = theirRole.color;
  const myStr = myHex.toString(16).padStart(6, "0").toUpperCase();
  const theirStr = theirHex.toString(16).padStart(6, "0").toUpperCase();

  // First half of own + second half of theirs
  const mixedStr = myStr.slice(0, 3) + theirStr.slice(3, 6);
  const mixedHex = parseInt(mixedStr, 16);

  const oldColor = myRole.color;
  await myRole.edit({ color: mixedHex });
  if (oldColor !== 0) pushColorHistory(interaction.user.id, oldColor);

  const info = colorInfo(mixedHex);
  const isNew = discoverColor(interaction.user.id, mixedHex, "mix");
  const rInfo = RARITY_INFO[info.rarity];

  const embed = new EmbedBuilder()
    .setTitle("🧪 Color Mix")
    .setColor(mixedHex)
    .setDescription(
      `\`${myStr.slice(0, 3)}***\` (${interaction.user})\n` +
      `\`***${theirStr.slice(3, 6)}\` (${target})\n` +
      `─────────────\n` +
      `\`#${mixedStr}\` → **${info.name}** ${rInfo.emoji} *${rInfo.label}*` +
      (isNew ? "\n\n✨ **NEW DISCOVERY!**" : ""),
    )
    .setFooter({ text: `Math: #${myStr} + #${theirStr} = #${mixedStr}` });

  await interaction.editReply({ embeds: [embed] });
  await checkAndAnnounceBadges(interaction, interaction.user.id);
}
