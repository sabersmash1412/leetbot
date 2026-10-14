const { requireGroup } = require('../middleware/requireGroup');
const { requireAdmin } = require('../middleware/requireAdmin');
const { listPresets, getPreset } = require('../../presets');
const roadmapService = require('../../services/roadmapService');

const CONFIRM_TTL_MS = 60 * 1000;
const pendingConfirmations = new Map(); // key: `${chatId}` -> { presetName, expiresAt }

function registerPresetsCommands(bot) {
  bot.command('presets', requireGroup(), async (ctx) => {
    const presets = listPresets();
    const lines = ['📦 *Available presets:*'];
    presets.forEach((p) => {
      lines.push(`• \`${p.name}\` — ${p.displayName} (${p.questionCount} questions)`);
    });
    lines.push('');
    lines.push('Use /usepreset <name> (admin only) to load one.');
    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  });

  bot.command('usepreset', requireGroup(), requireAdmin(), async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const name = args[0];
    const confirmFlag = args[1] === 'confirm';

    if (!name) {
      await ctx.reply('Usage: /usepreset <name> — see /presets for available names.');
      return;
    }

    const preset = getPreset(name);
    if (!preset) {
      await ctx.reply(`⚠️ Unknown preset \`${name}\`. Use /presets to see available options.`, { parse_mode: 'Markdown' });
      return;
    }

    const chatId = String(ctx.chat.id);
    const group = await roadmapService.getOrCreateGroup(chatId, ctx.chat.title);
    const existingTotal = roadmapService.countTotalQuestions(group);

    if (existingTotal > 0 && !confirmFlag) {
      pendingConfirmations.set(chatId, { presetName: name, expiresAt: Date.now() + CONFIRM_TTL_MS });
      await ctx.reply(
        `⚠️ This will overwrite the current roadmap (${existingTotal} questions) with *${preset.displayName}* (${preset.modules.reduce((s, m) => s + m.questions.length, 0)} questions).\n\nReply \`/usepreset ${name} confirm\` within 60s to proceed.`,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    if (existingTotal > 0 && confirmFlag) {
      const pending = pendingConfirmations.get(chatId);
      if (!pending || pending.presetName !== name || pending.expiresAt < Date.now()) {
        await ctx.reply(`⚠️ No pending confirmation for \`${name}\`. Run \`/usepreset ${name}\` again first.`, { parse_mode: 'Markdown' });
        return;
      }
      pendingConfirmations.delete(chatId);
    }

    roadmapService.loadPreset(group, preset);
    await group.save();

    const firstQuestion = roadmapService.getActiveQuestion(group);
    await ctx.reply(
      `✅ Loaded *${preset.displayName}*. First target: *${firstQuestion.title}*. Tomorrow's 9AM post will kick things off!\n\nAdmins can still use /addmodule and /addquestion to extend this roadmap.`,
      { parse_mode: 'Markdown' },
    );
  });
}

module.exports = { registerPresetsCommands };
