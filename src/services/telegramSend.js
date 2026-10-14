const logger = require('../utils/logger');

/**
 * Sends a message to a chat, handling the two Telegram failure modes that
 * matter for unattended cron jobs:
 *   - 403 (bot was kicked / chat no longer reachable): caller should mark
 *     the group inactive so future cron runs skip it. Signaled via
 *     { ok: false, kicked: true }.
 *   - 429 (rate limited): retried once after the server-specified delay.
 * Never throws.
 */
async function safeSendMessage(telegram, chatId, text, extra) {
  try {
    await telegram.sendMessage(chatId, text, extra);
    return { ok: true };
  } catch (err) {
    const errorCode = err.response && err.response.error_code;

    if (errorCode === 403) {
      logger.warn(`Bot was kicked/blocked from chat ${chatId}, marking inactive.`);
      return { ok: false, kicked: true };
    }

    if (errorCode === 429) {
      const retryAfter = (err.response.parameters && err.response.parameters.retry_after) || 1;
      logger.warn(`Rate limited sending to chat ${chatId}, retrying after ${retryAfter}s`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      try {
        await telegram.sendMessage(chatId, text, extra);
        return { ok: true };
      } catch (retryErr) {
        logger.error(`Retry failed sending to chat ${chatId}:`, retryErr.message);
        return { ok: false };
      }
    }

    logger.error(`Failed sending to chat ${chatId}:`, err.message);
    return { ok: false };
  }
}

module.exports = { safeSendMessage };
