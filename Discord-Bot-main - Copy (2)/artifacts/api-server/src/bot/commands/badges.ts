import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { BADGE_DEFS, getBadgeCtx, isUnlocked } from "../badges";
import { getBadges } from "../store";

export const data = new SlashCommandBuilder()
  .setName("badges")
  .setDescription("View all collectable badges and your progress")
  .addUserOption(opt =>
    opt.setName("user").setDescription("View someone else's badges").setRequired(false),
  );

function progressBar(current: number, target: number, width = 12): string {
  const ratio = Math.max(0, Math.min(1, current / target));
  const filled = Math.round(ratio * width);
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("user") ?? interaction.user;
  const ctx = getBadgeCtx(target.id);
  const earned = new Set(getBadges(target.id));

  const lines = BADGE_DEFS.map(def => {
    const { current, target: t } = def.progress(ctx);
    const isOwned = earned.has(def.id) || isUnlocked(def, ctx);
    if (isOwned) {
      return `${def.emoji} **${def.name}** ✅\n*${def.description}*`;
    }
    const shown = Math.min(current, t);
    return `${def.emoji} **${def.name}**\n` +
      `\`${progressBar(shown, t)}\` ${shown} / ${t}\n*${def.description}*`;
  });

  const ownedCount = BADGE_DEFS.filter(d => earned.has(d.id) || isUnlocked(d, ctx)).length;

  const embed = new EmbedBuilder()
    .setTitle(`🎖️ Badges — ${target.username}`)
    .setColor(0xf1c40f)
    .setDescription(lines.join("\n\n"))
    .setFooter({ text: `${ownedCount} / ${BADGE_DEFS.length} badges earned` });

  await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
}
