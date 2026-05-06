import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("List all available commands");

export async function execute(interaction: ChatInputCommandInteraction) {
  const commands = interaction.client.application?.commands.cache;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Available Commands")
    .setDescription(
      commands && commands.size > 0
        ? commands
            .map((cmd) => `**/${cmd.name}** — ${cmd.description}`)
            .join("\n")
        : "No commands registered yet."
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
