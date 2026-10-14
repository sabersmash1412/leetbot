const Member = require('../../models/Member');
const { requireGroup } = require('../middleware/requireGroup');
const { requireAdmin } = require('../middleware/requireAdmin');
const roadmapService = require('../../services/roadmapService');

const MAX_MESSAGE_LENGTH = 4000; // stay comfortably under Telegram's 4096 cap

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function registerRoadmapCommands(bot) {
  bot.command('addmodule', requireGroup(), requireAdmin(), async (ctx) => {
    const name = ctx.message.text.split(' ').slice(1).join(' ').trim();
    if (!name) {
      await ctx.reply('Usage: /addmodule <name>');
      return;
    }

    const group = await roadmapService.getOrCreateGroup(ctx.chat.id, ctx.chat.title);
    const module = roadmapService.addModule(group, name);
    await group.save();

    await ctx.reply(`📘 Module added: *${name}* (module #${group.modules.indexOf(module) + 1}).`, { parse_mode: 'Markdown' });
  });

  bot.command('addquestion', requireGroup(), requireAdmin(), async (ctx) => {
    const rest = ctx.message.text.split(' ').slice(1).join(' ').trim();
    const firstSpace = rest.indexOf(' ');
    if (firstSpace === -1 || !rest.includes('|')) {
      await ctx.reply('Usage: /addquestion <module#> <title> | <leetcode_url>');
      return;
    }

    const moduleNumRaw = rest.slice(0, firstSpace);
    const remainder = rest.slice(firstSpace + 1);
    const moduleNum = parseInt(moduleNumRaw, 10);
    const pipeIndex = remainder.indexOf('|');
    if (Number.isNaN(moduleNum) || pipeIndex === -1) {
      await ctx.reply('Usage: /addquestion <module#> <title> | <leetcode_url>');
      return;
    }

    const title = remainder.slice(0, pipeIndex).trim();
    const url = remainder.slice(pipeIndex + 1).trim();
    if (!title || !url) {
      await ctx.reply('Usage: /addquestion <module#> <title> | <leetcode_url>');
      return;
    }

    const group = await roadmapService.getOrCreateGroup(ctx.chat.id, ctx.chat.title);

    try {
      roadmapService.addQuestion(group, moduleNum - 1, title, url, String(ctx.from.id));
    } catch (err) {
      await ctx.reply(`⚠️ ${err.message}`);
      return;
    }

    await group.save();
    const total = roadmapService.countTotalQuestions(group);
    await ctx.reply(`➕ Added *${title}* to module #${moduleNum}. Roadmap now has ${total} question(s) total.`, { parse_mode: 'Markdown' });
  });

  bot.command('skip', requireGroup(), requireAdmin(), async (ctx) => {
    const group = await roadmapService.getOrCreateGroup(ctx.chat.id, ctx.chat.title);
    roadmapService.advancePointer(group);
    group.activeQuestionSetAt = new Date();
    await group.save();

    const activeQuestion = roadmapService.getActiveQuestion(group);
    if (!activeQuestion) {
      await ctx.reply('⏭ Skipped. No more questions left — roadmap complete!');
      return;
    }
    await ctx.reply(`⏭ Skipped. New target: *${activeQuestion.title}*.`, { parse_mode: 'Markdown' });
  });

  bot.command('setactive', requireGroup(), requireAdmin(), async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const moduleNum = parseInt(args[0], 10);
    const questionNum = parseInt(args[1], 10);
    if (Number.isNaN(moduleNum) || Number.isNaN(questionNum)) {
      await ctx.reply('Usage: /setactive <module#> <question#>');
      return;
    }

    const group = await roadmapService.getOrCreateGroup(ctx.chat.id, ctx.chat.title);
    const moduleIndex = moduleNum - 1;
    const questionIndex = questionNum - 1;
    const module = group.modules[moduleIndex];
    if (!module || !module.questions[questionIndex]) {
      await ctx.reply(`⚠️ Module #${moduleNum} question #${questionNum} doesn't exist.`);
      return;
    }

    group.activeModuleIndex = moduleIndex;
    group.activeQuestionIndex = questionIndex;
    group.activeQuestionSetAt = new Date();
    group.cycleComplete = false;
    await group.save();

    const question = module.questions[questionIndex];
    await ctx.reply(`🎯 Active target set to module #${moduleNum}, question #${questionNum}: *${question.title}*.`, { parse_mode: 'Markdown' });
  });

  bot.command('roadmap', requireGroup(), async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const group = await roadmapService.getOrCreateGroup(ctx.chat.id, ctx.chat.title);

    if (!group.modules.length) {
      await ctx.reply("This group doesn't have a roadmap yet. Use /presets to load a ready-made one, or /addmodule to build your own.");
      return;
    }

    const moduleArg = args[0] ? parseInt(args[0], 10) : null;

    if (moduleArg) {
      const module = group.modules[moduleArg - 1];
      if (!module) {
        await ctx.reply(`⚠️ Module #${moduleArg} doesn't exist.`);
        return;
      }
      const activeQuestion = roadmapService.getActiveQuestion(group);
      const lines = [`<b>Module ${moduleArg}: ${escapeHtml(module.name)}</b>`];
      module.questions.forEach((q, i) => {
        const isActive = activeQuestion && String(activeQuestion._id) === String(q._id);
        const marker = isActive ? '🎯' : '⬜';
        lines.push(`${marker} ${i + 1}. ${escapeHtml(q.title)}`);
      });
      await sendChunked(ctx, lines.join('\n'));
      return;
    }

    // Summary view
    const activeQuestion = roadmapService.getActiveQuestion(group);
    const lines = ['<b>📚 Roadmap overview</b>'];
    group.modules.forEach((module, i) => {
      lines.push(`Module ${i + 1}: ${escapeHtml(module.name)} — ${module.questions.length} question(s)`);
    });

    if (activeQuestion) {
      const activeModule = group.modules[group.activeModuleIndex];
      lines.push('');
      lines.push(`🎯 <b>Current target:</b> ${escapeHtml(activeQuestion.title)} (Module ${group.activeModuleIndex + 1}: ${escapeHtml(activeModule.name)})`);

      const members = await Member.find({ chatId: String(ctx.chat.id), isActive: true });
      const pending = members.filter((m) => !m.completedQuestionIds.some((id) => String(id) === String(activeQuestion._id)));
      const done = members.length - pending.length;
      lines.push(`Progress: ${done}/${members.length} registered member(s) done`);
    } else if (group.cycleComplete) {
      lines.push('');
      lines.push('🎉 Roadmap complete! Use /usepreset or /addmodule to start a new one.');
    }

    lines.push('');
    lines.push('Use /roadmap <module#> to see the full question list for a module.');

    await sendChunked(ctx, lines.join('\n'));
  });
}

async function sendChunked(ctx, text) {
  if (text.length <= MAX_MESSAGE_LENGTH) {
    await ctx.reply(text, { parse_mode: 'HTML' });
    return;
  }
  let remaining = text;
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, MAX_MESSAGE_LENGTH);
    await ctx.reply(chunk, { parse_mode: 'HTML' });
    remaining = remaining.slice(MAX_MESSAGE_LENGTH);
  }
}

module.exports = { registerRoadmapCommands };
