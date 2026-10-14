const Group = require('../models/Group');
const roadmapService = require('./roadmapService');
const { safeSendMessage } = require('./telegramSend');
const { runAllSettled } = require('../utils/asyncSettled');
const logger = require('../utils/logger');

function todayDateString() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

async function processGroup(telegram, group) {
  const today = todayDateString();
  if (group.lastMorningRunDate === today) {
    return; // already ran today — guards against a double-firing external pinger
  }

  const isFreshRoadmap = group.activeQuestionSetAt === null;

  if (!isFreshRoadmap) {
    roadmapService.advancePointer(group);
  }

  const activeQuestion = roadmapService.getActiveQuestion(group);

  if (!activeQuestion) {
    if (group.cycleComplete && !group.cycleCompleteAnnounced) {
      const result = await safeSendMessage(
        telegram,
        group.chatId,
        '🎉 Roadmap complete! Ask an admin to load a new /usepreset or /addmodule more questions.',
      );
      if (result.kicked) {
        group.isActive = false;
      }
      group.cycleCompleteAnnounced = true;
    }
    group.lastMorningRunDate = today;
    await group.save();
    return;
  }

  group.activeQuestionSetAt = new Date();
  group.lastMorningRunDate = today;
  await group.save();

  const activeModule = group.modules[group.activeModuleIndex];
  const text = `🌅 Good morning, campers!\n\n`
    + `Today's target: <b>${escapeHtml(activeQuestion.title)}</b>\n`
    + `Module: ${escapeHtml(activeModule.name)} (Q${group.activeQuestionIndex + 1} of ${activeModule.questions.length})`;

  const result = await safeSendMessage(telegram, group.chatId, text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: '🔗 Solve on LeetCode', url: activeQuestion.url }]],
    },
  });

  if (result.kicked) {
    group.isActive = false;
    await group.save();
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function runMorningCron(telegram) {
  const groups = await Group.find({ isActive: true, 'modules.0': { $exists: true } });
  const summary = await runAllSettled(groups, (group) => processGroup(telegram, group), { label: 'morning' });
  logger.info('morning cron summary:', summary);
  return summary;
}

module.exports = { runMorningCron };
