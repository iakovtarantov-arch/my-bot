import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("roll")
  .setDescription("Roll a dice")
  .addIntegerOption((option) =>
    option
      .setName("sides")
      .setDescription("Number of sides on the dice (default: 6)")
      .setMinValue(2)
      .setMaxValue(1000)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const sides = interaction.options.getInteger("sides") ?? 6;
  const result = Math.floor(Math.random() * sides) + 1;
  await interaction.reply(
    `You rolled a **${result}** on a d${sides}!`
  );
}
