import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("hello")
  .setDescription("Get a friendly greeting from the bot");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply(
    `Hello, ${interaction.user.displayName}! 👋 Nice to meet you.`
  );
}
