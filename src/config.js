require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config = {
  telegramBotToken: required('TELEGRAM_BOT_TOKEN'),
  mongodbUri: required('MONGODB_URI'),
  cronSecret: required('CRON_SECRET'),
  port: parseInt(process.env.PORT || '3000', 10),
  publicUrl: process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '',
  webhookSecretPath: process.env.WEBHOOK_SECRET_PATH || 'telegraf-webhook',
  tz: process.env.TZ || 'UTC',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
};

module.exports = config;
