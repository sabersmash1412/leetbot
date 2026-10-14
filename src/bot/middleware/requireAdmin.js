const { isGroupAdmin } = require('../../services/adminCheck');

function requireAdmin() {
  return async (ctx, next) => {
    const chatId = ctx.chat && ctx.chat.id;
    const userId = ctx.from && ctx.from.id;
    if (!chatId || !userId) {
      return next();
    }

    const allowed = await isGroupAdmin(ctx.telegram, chatId, userId);
    if (!allowed) {
      await ctx.reply('⛔ Only group admins can do that.');
      return;
    }
    return next();
  };
}

module.exports = { requireAdmin };
