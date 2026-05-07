import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("info")
  .setDescription("Show information about this server");

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
    return;
  }

  const owner = await guild.fetchOwner();

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(guild.name)
    .setThumbnail(guild.iconURL())
    .addFields(
      { name: "Owner", value: owner.user.tag, inline: true },
      {
        name: "Members",
        value: guild.memberCount.toString(),
        inline: true,
      },
      {
        name: "Created",
        value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
        inline: true,
      },
      {
        name: "Channels",
        value: guild.channels.cache.size.toString(),
        inline: true,
      },
      {
        name: "Roles",
        value: guild.roles.cache.size.toString(),
        inline: true,
      }
    )
    .setFooter({ text: `Server ID: ${guild.id}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
