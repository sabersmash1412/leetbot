const Member = require('../../models/Member');
const { requireGroup } = require('../middleware/requireGroup');
const roadmapService = require('../../services/roadmapService');

function mentionFor(member) {
  if (member.telegramUsername) return `@${member.telegramUsername}`;
  return member.firstName || 'someone';
}

function registerStatusCommands(bot) {
  bot.command('status', requireGroup(), async (ctx) => {
    const chatId = String(ctx.chat.id);
    const group = await roadmapService.getOrCreateGroup(chatId, ctx.chat.title);
    const activeQuestion = roadmapService.getActiveQuestion(group);

    if (!activeQuestion) {
      await ctx.reply(group.cycleComplete
        ? '🎉 Roadmap complete! No active target right now.'
        : "No active target yet — this group doesn't have a roadmap. Use /presets or /addmodule to set one up.");
      return;
    }

    const members = await Member.find({ chatId, isActive: true });
    const done = [];
    const pending = [];
    for (const member of members) {
      const isDone = member.completedQuestionIds.some((id) => String(id) === String(activeQuestion._id));
      (isDone ? done : pending).push(member);
    }

    const lines = [`🎯 *Today's target:* ${activeQuestion.title}`, ''];
    lines.push(`✅ Done: ${done.length ? done.map(mentionFor).join(', ') : 'none yet'}`);
    lines.push(`⬜ Pending: ${pending.length ? pending.map(mentionFor).join(', ') : 'none — everyone finished!'}`);

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  });

  bot.command('leaderboard', requireGroup(), async (ctx) => {
    const chatId = String(ctx.chat.id);
    const members = await Member.find({ chatId, isActive: true });

    if (!members.length) {
      await ctx.reply('No registered members yet in this group.');
      return;
    }

    const ranked = members
      .slice()
      .sort((a, b) => (b.currentStreak - a.currentStreak) || (b.completedQuestionIds.length - a.completedQuestionIds.length));

    const lines = ['🏆 *Leaderboard*'];
    ranked.forEach((m, i) => {
      lines.push(`${i + 1}. ${mentionFor(m)} — 🔥${m.currentStreak} streak, ${m.completedQuestionIds.length} solved`);
    });

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  });
}

module.exports = { registerStatusCommands };
