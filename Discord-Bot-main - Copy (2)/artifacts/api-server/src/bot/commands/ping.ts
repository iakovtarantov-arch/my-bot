import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Check if the bot is alive and see its latency");

export async function execute(interaction: ChatInputCommandInteraction) {
  const sent = await interaction.reply({
    content: "Pinging...",
    fetchReply: true,
  });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  await interaction.editReply(
    `Pong! Roundtrip: **${latency}ms** | WebSocket: **${interaction.client.ws.ping}ms**`
  );
}
