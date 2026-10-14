const Group = require('../models/Group');
const Member = require('../models/Member');
const roadmapService = require('./roadmapService');
const { safeSendMessage } = require('./telegramSend');
const { runAllSettled } = require('../utils/asyncSettled');
const logger = require('../utils/logger');

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function mentionLink(member) {
  if (member.telegramUsername) return `@${escapeHtml(member.telegramUsername)}`;
  const name = escapeHtml(member.firstName || 'Someone');
  return `<a href="tg://user?id=${member.telegramUserId}">${name}</a>`;
}

async function processGroup(telegram, group) {
  const activeQuestion = roadmapService.getActiveQuestion(group);
  if (!activeQuestion) return; // no roadmap posted yet, or cycle complete

  const members = await Member.find({ chatId: group.chatId, isActive: true });
  if (!members.length) return;

  const pending = members.filter(
    (m) => !m.completedQuestionIds.some((id) => String(id) === String(activeQuestion._id)),
  );

  let text;
  if (pending.length === 0) {
    text = `✅ Everyone in this group crushed today's question (<b>${escapeHtml(activeQuestion.title)}</b>)! No Wall of Shame tonight.`;
  } else {
    const names = pending.map((m) => `• ${mentionLink(m)}`).join('\n');
    text = `🌙 <b>Wall of Shame</b> — today's target was <b>${escapeHtml(activeQuestion.title)}</b>\n\n`
      + `Still pending:\n${names}\n\n`
      + 'There\'s still time before tomorrow\'s new question drops!';
  }

  const result = await safeSendMessage(telegram, group.chatId, text, { parse_mode: 'HTML' });
  if (result.kicked) {
    group.isActive = false;
    await group.save();
  }
}

async function runEveningCron(telegram) {
  const groups = await Group.find({ isActive: true, 'modules.0': { $exists: true } });
  const summary = await runAllSettled(groups, (group) => processGroup(telegram, group), { label: 'evening' });
  logger.info('evening cron summary:', summary);
  return summary;
}

module.exports = { runEveningCron };
