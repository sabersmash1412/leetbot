const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./utils/logger');
const { createBot } = require('./bot');
const { createCronRouter } = require('./cron/router');

async function main() {
  mongoose.connection.on('error', (err) => logger.error('MongoDB connection error:', err.message));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(config.mongodbUri);
  logger.info('Connected to MongoDB');

  const bot = createBot();
  const app = express();

  app.get('/healthz', (req, res) => res.status(200).json({ ok: true }));

  app.use('/cron', createCronRouter(bot));

  const webhookPath = `/telegraf/${config.webhookSecretPath}`;
  if (config.publicUrl) {
    app.use(await bot.createWebhook({ domain: config.publicUrl, path: webhookPath }));
    logger.info(`Telegram webhook mounted at ${webhookPath}`);
  } else {
    logger.warn('PUBLIC_URL not set — webhook not registered. Set PUBLIC_URL and redeploy to receive Telegram updates.');
  }

  app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port}`);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason instanceof Error ? reason.message : reason);
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err.message);
  });

  const shutdown = async () => {
    logger.info('Shutting down...');
    await mongoose.connection.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error('Fatal startup error:', err.message);
  process.exit(1);
});
