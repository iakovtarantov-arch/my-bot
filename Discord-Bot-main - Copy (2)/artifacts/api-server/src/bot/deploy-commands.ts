import { REST, Routes } from "discord.js";
import { logger } from "../lib/logger";
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
import * as stealColor from "./commands/steal-color";
import * as roleboard from "./commands/roleboard";
import * as mix from "./commands/mix";
import * as colorDuel from "./commands/color-duel";
import * as colorDex from "./commands/color-dex";
import * as dexLeaderboard from "./commands/dex-leaderboard";
import * as badges from "./commands/badges";
import * as dexStats from "./commands/dex-stats";
import * as myTwin from "./commands/my-twin";

const commands = [
  ping, hello, info, help, roll,
  createRole, randomColor, deleteRole, renameRole, myRole,
  colorHistory, setColor, stealColor, roleboard,
  mix, colorDuel, colorDex, dexLeaderboard,
  badges, dexStats, myTwin,
];

export async function deployCommands() {
  const token = process.env["DISCORD_BOT_TOKEN"];
  const clientId = process.env["DISCORD_CLIENT_ID"];

  if (!token || !clientId) {
    logger.warn("DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID not set, skipping command deployment");
    return;
  }

  const rest = new REST().setToken(token);
  const commandData = commands.map((cmd) => cmd.data.toJSON());

  try {
    logger.info({ count: commandData.length }, "Registering slash commands");
    await rest.put(Routes.applicationCommands(clientId), { body: commandData });
    logger.info("Slash commands registered successfully");
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
    throw err;
  }
}
