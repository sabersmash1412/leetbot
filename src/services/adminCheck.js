const logger = require('../utils/logger');

const ADMIN_STATUSES = new Set(['creator', 'administrator']);
const CACHE_TTL_MS = 60 * 1000;

// In-memory TTL cache, keyed by `${chatId}:${userId}` -> { isAdmin, expiresAt }
const cache = new Map();

async function isGroupAdmin(telegram, chatId, userId) {
  const key = `${chatId}:${userId}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.isAdmin;
  }

  try {
    const member = await telegram.getChatMember(chatId, userId);
    const isAdmin = ADMIN_STATUSES.has(member.status);
    cache.set(key, { isAdmin, expiresAt: Date.now() + CACHE_TTL_MS });
    return isAdmin;
  } catch (err) {
    logger.warn(`isGroupAdmin check failed for chat ${chatId} user ${userId}:`, err.message);
    return false;
  }
}

module.exports = { isGroupAdmin };
