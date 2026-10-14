function requireGroup() {
  return async (ctx, next) => {
    if (ctx.chat && ctx.chat.type === 'private') {
      await ctx.reply('This command only works inside a group chat, not in a DM with me.');
      return;
    }
    return next();
  };
}

module.exports = { requireGroup };
