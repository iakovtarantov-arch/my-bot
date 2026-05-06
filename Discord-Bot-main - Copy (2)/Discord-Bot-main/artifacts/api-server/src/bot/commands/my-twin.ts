import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { loadData } from "../store";
import { rgbDistance, formatHex, colorName } from "../color-naming";

const MAX_DISTANCE = Math.sqrt(255 * 255 * 3); // ≈ 441.67

export const data = new SlashCommandBuilder()
  .setName("my-twin")
  .setDescription("Find your color twin — who has the closest role color to yours")
  .addUserOption(opt =>
    opt.setName("user").setDescription("Find someone else's color twin").setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const target = interaction.options.getUser("user") ?? interaction.user;
  const roleMap = loadData();
  const myRoleId = roleMap[target.id];

  if (!myRoleId) {
    await interaction.reply({
      content: `${target.id === interaction.user.id ? "You don't" : `**${target.username}** doesn't`} have a personal role yet.`,
      ephemeral: true,
    });
    return;
  }

  const myRole = guild.roles.cache.get(myRoleId);
  if (!myRole || myRole.color === 0) {
    await interaction.reply({
      content: `${target.id === interaction.user.id ? "Your" : `**${target.username}'s**`} role has no color set yet.`,
      ephemeral: true,
    });
    return;
  }

  const myHex = myRole.color;
  type Row = { userId: string; hex: number; distance: number };
  const rows: Row[] = [];

  for (const [userId, roleId] of Object.entries(roleMap)) {
    if (userId === target.id) continue;
    const role = guild.roles.cache.get(roleId);
    if (!role || role.color === 0) continue;
    rows.push({ userId, hex: role.color, distance: rgbDistance(myHex, role.color) });
  }

  if (rows.length === 0) {
    await interaction.reply({
      content: "No other colored roles to compare against — invite some friends to make personal roles!",
      ephemeral: true,
    });
    return;
  }

  rows.sort((a, b) => a.distance - b.distance);
  const top = rows.slice(0, 10);
  const medals = ["🥇", "🥈", "🥉"];

  const lines = top.map((r, i) => {
    const place = medals[i] ?? `\`#${i + 1}\``;
    const pct = (100 * (1 - r.distance / MAX_DISTANCE)).toFixed(1);
    return `${place} <@${r.userId}> — **${pct}%** match · \`${formatHex(r.hex)}\` *${colorName(r.hex)}*`;
  });

  const twin = top[0]!;
  const twinPct = (100 * (1 - twin.distance / MAX_DISTANCE)).toFixed(1);

  const embed = new EmbedBuilder()
    .setTitle(`🪞 ${target.username}'s Color Twins`)
    .setColor(myHex)
    .setDescription(
      `**Your color:** \`${formatHex(myHex)}\` *${colorName(myHex)}*\n` +
      `**Closest twin:** <@${twin.userId}> — ${twinPct}% match\n\n` +
      lines.join("\n"),
    )
    .setFooter({ text: `${rows.length} colored role(s) compared` });

  await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
}
