const Member = require('../../models/Member');
const Group = require('../../models/Group');
const { validateUsername } = require('../../services/leetcodeClient');
const { requireGroup } = require('../middleware/requireGroup');
const { getActiveQuestion } = require('../../services/roadmapService');

function registerRegisterCommands(bot) {
  bot.command('register', requireGroup(), async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const leetcodeUsername = args[0];
    if (!leetcodeUsername) {
      await ctx.reply('Usage: /register <leetcode_username>');
      return;
    }

    const validation = await validateUsername(leetcodeUsername);
    if (!validation.ok) {
      await ctx.reply('⚠️ Could not reach LeetCode to verify that username right now. Please try again shortly.');
      return;
    }
    if (!validation.exists) {
      await ctx.reply(`⚠️ Couldn't find a LeetCode user named \`${leetcodeUsername}\`. Double-check it — it's the handle in your profile URL: leetcode.com/u/USERNAME/`, { parse_mode: 'Markdown' });
      return;
    }

    const chatId = String(ctx.chat.id);
    const telegramUserId = String(ctx.from.id);

    await Member.findOneAndUpdate(
      { chatId, telegramUserId },
      {
        chatId,
        telegramUserId,
        telegramUsername: ctx.from.username,
        firstName: ctx.from.first_name,
        leetcodeUsername,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await ctx.reply(`✅ Registered! You're now tracked as LeetCode user \`${leetcodeUsername}\` in this group.`, { parse_mode: 'Markdown' });
  });

  bot.command('unregister', requireGroup(), async (ctx) => {
    const chatId = String(ctx.chat.id);
    const telegramUserId = String(ctx.from.id);
    const member = await Member.findOneAndUpdate(
      { chatId, telegramUserId },
      { isActive: false },
    );
    if (!member) {
      await ctx.reply("You weren't registered in this group.");
      return;
    }
    await ctx.reply("You've been unregistered from tracking in this group.");
  });

  bot.command('whoami', requireGroup(), async (ctx) => {
    const chatId = String(ctx.chat.id);
    const telegramUserId = String(ctx.from.id);
    const member = await Member.findOne({ chatId, telegramUserId, isActive: true });
    if (!member) {
      await ctx.reply("You're not registered in this group yet. Use /register <leetcode_username> to start.");
      return;
    }

    const group = await Group.findOne({ chatId });
    const activeQuestion = group ? getActiveQuestion(group) : null;
    const doneActive = activeQuestion
      && member.completedQuestionIds.some((id) => String(id) === String(activeQuestion._id));

    const lines = [
      `You are \`${member.leetcodeUsername}\`.`,
      `Current streak: ${member.currentStreak} 🔥 (longest: ${member.longestStreak})`,
      `Completed ${member.completedQuestionIds.length} question(s) total.`,
    ];
    if (activeQuestion) {
      lines.push(`Today's target (${activeQuestion.title}): ${doneActive ? '✅ done' : '⬜ pending'}`);
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  });
}

module.exports = { registerRegisterCommands };
