import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js";
import { loadData, pushColorHistory, discoverColor } from "../store";
import { NAMED_COLORS } from "../colors";
import { colorInfo, RARITY_INFO } from "../color-naming";
import { checkAndAnnounceBadges } from "../badges";

export const data = new SlashCommandBuilder()
  .setName("set-color")
  .setDescription("Set your role to a named color")
  .addStringOption((option) =>
    option
      .setName("color")
      .setDescription("Choose a color by name")
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused().toLowerCase();
  const matches = NAMED_COLORS.filter((c) =>
    c.name.toLowerCase().includes(focused)
  ).slice(0, 25);

  await interaction.respond(
    matches.map((c) => ({
      name: `${c.emoji} ${c.name}  (#${c.hex.toString(16).padStart(6, "0").toUpperCase()})`,
      value: c.hex.toString(),
    }))
  );
}

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

  const rawValue = interaction.options.getString("color", true);
  const colorNum = parseInt(rawValue, 10);

  if (isNaN(colorNum)) {
    await interaction.reply({ content: "Invalid color selection. Please choose from the list.", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const oldColor = role.color;
  await role.edit({ color: colorNum });

  if (oldColor !== 0) {
    pushColorHistory(userId, oldColor);
  }

  const matched = NAMED_COLORS.find((c) => c.hex === colorNum);
  const label = matched ? `${matched.emoji} ${matched.name}` : "Custom";
  const hexStr = `#${colorNum.toString(16).padStart(6, "0").toUpperCase()}`;

  const info = colorInfo(colorNum);
  const isNew = discoverColor(userId, colorNum, "set");
  const rInfo = RARITY_INFO[info.rarity];
  const newTag = isNew ? `\n✨ **NEW DISCOVERY!** *${info.name}* added to your dex.` : "";

  await interaction.editReply(
    `🎨 Your role color is now **${label}** (\`${hexStr}\`) ${rInfo.emoji} *${rInfo.label}*${newTag}`,
  );
  await checkAndAnnounceBadges(interaction, userId);
}
