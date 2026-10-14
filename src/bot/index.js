const { Telegraf } = require('telegraf');
const config = require('../config');
const logger = require('../utils/logger');

const { registerStartCommand } = require('./commands/start');
const { registerRegisterCommands } = require('./commands/register');
const { registerRoadmapCommands } = require('./commands/roadmap');
const { registerPresetsCommands } = require('./commands/presets');
const { registerStatusCommands } = require('./commands/status');

function createBot() {
  const bot = new Telegraf(config.telegramBotToken);

  registerStartCommand(bot);
  registerRegisterCommands(bot);
  registerRoadmapCommands(bot);
  registerPresetsCommands(bot);
  registerStatusCommands(bot);

  bot.catch((err, ctx) => {
    logger.error(`Unhandled error for update ${ctx.updateType}:`, err.message);
  });

  return bot;
}

module.exports = { createBot };
