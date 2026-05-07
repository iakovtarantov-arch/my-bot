import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js";
import { logger } from "../lib/logger";
import { deployCommands } from "./deploy-commands";
import * as ping from "./commands/ping";
import * as hello from "./commands/hello";
import * as info from "./commands/info";
import * as help from "./commands/help";
import * as roll from "./commands/roll";
import * as createRole from "./commands/create-role";
import * as randomColor from "./commands/random-color";
import * as deleteRole from "./commands/delete-role";
import * as renameRole from "./commands/rename-role";
import * as myRole from "./commands/my-role";
import * as colorHistory from "./commands/color-history";
import * as setColor from "./commands/set-color";
import * as roleboard from "./commands/roleboard";
import * as mix from "./commands/mix";
import * as colorDuel from "./commands/color-duel";
import * as colorDex from "./commands/color-dex";
import * as dexLeaderboard from "./commands/dex-leaderboard";
import * as badges from "./commands/badges";
import * as dexStats from "./commands/dex-stats";
import * as myTwin from "./commands/my-twin";

type Command = {
  data: { name: string; toJSON(): unknown };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
};

const commandModules: Command[] = [
  ping, hello, info, help, roll,
  createRole, randomColor, deleteRole, renameRole, myRole,
  colorHistory, setColor, roleboard,
  mix, colorDuel, colorDex, dexLeaderboard,
  badges, dexStats, myTwin,
];

export async function startBot() {
  const token = process.env["DISCORD_BOT_TOKEN"];

  if (!token) {
    logger.warn("DISCORD_BOT_TOKEN not set — Discord bot will not start");
    return;
  }

  await deployCommands();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
    ],
  });

  const commands = new Collection<string, Command>();
  for (const mod of commandModules) {
    commands.set(mod.data.name, mod);
  }

  client.once(Events.ClientReady, (readyClient) => {
    logger.info({ tag: readyClient.user.tag }, "Discord bot is ready");
  });

  client.on(Events.Error, (err) => {
    logger.error({ err }, "Discord client error");
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) {
      try {
        if (interaction.customId.startsWith("duel:")) {
          await colorDuel.handleButton(interaction);
        } else if (interaction.customId.startsWith("dex:")) {
          await colorDex.handleButton(interaction);
        } else if (interaction.customId.startsWith("lb:")) {
          await dexLeaderboard.handleButton(interaction);
        }
      } catch (err) {
        logger.error({ err, customId: interaction.customId }, "Button handler error");
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "Something went wrong handling that button.", ephemeral: true });
          }
        } catch { /* ignore */ }
      }
      return;
    }

    if (interaction.isAutocomplete()) {
      const command = commands.get(interaction.commandName);
      if (command?.autocomplete) {
        try {
          await command.autocomplete(interaction);
        } catch (err) {
          logger.error({ err, commandName: interaction.commandName }, "Autocomplete error");
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) {
      logger.warn({ commandName: interaction.commandName }, "Unknown command received");
      await interaction.reply({ content: "Unknown command.", ephemeral: true });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error({ err, commandName: interaction.commandName }, "Error executing command");
      try {
        const msg = { content: "There was an error running this command.", ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      } catch (replyErr) {
        logger.warn({ replyErr }, "Could not send error reply to interaction");
      }
    }
  });

  await client.login(token);
}