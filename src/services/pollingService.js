const Group = require('../models/Group');
const Member = require('../models/Member');
const Submission = require('../models/Submission');
const DailyChallengeCache = require('../models/DailyChallengeCache');
const roadmapService = require('./roadmapService');
const { getRecentAcSubmissions, getDailyChallenge } = require('./leetcodeClient');
const { safeSendMessage } = require('./telegramSend');
const { runAllSettled } = require('../utils/asyncSettled');
const logger = require('../utils/logger');

const DUPLICATE_KEY_ERROR = 11000;

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function getOrFetchDailyChallenge() {
  const today = new Date().toISOString().slice(0, 10);
  let cached = await DailyChallengeCache.findOne({ date: today });
  if (cached) return cached;

  const result = await getDailyChallenge();
  if (!result.ok) {
    logger.warn('Could not fetch daily challenge this cycle:', result.error.message);
    return null;
  }

  try {
    cached = await DailyChallengeCache.create({
      date: result.challenge.date,
      titleSlug: result.challenge.titleSlug,
      title: result.challenge.title,
      link: result.challenge.link,
    });
  } catch (err) {
    if (err.code === DUPLICATE_KEY_ERROR) {
      cached = await DailyChallengeCache.findOne({ date: today });
    } else {
      throw err;
    }
  }
  return cached;
}

async function processMember(telegram, group, activeQuestion, dailyChallenge, member) {
  const result = await getRecentAcSubmissions(member.leetcodeUsername, 20);
  if (!result.ok) {
    return; // transient failure — next poll cycle will retry naturally
  }

  const newSubmissions = result.submissions.filter((s) => s.timestamp > member.lastSeenSubmissionTimestamp);
  if (newSubmissions.length === 0) return;

  let maxTimestamp = member.lastSeenSubmissionTimestamp;

  for (const submission of newSubmissions) {
    maxTimestamp = Math.max(maxTimestamp, submission.timestamp);
    if (submission.statusDisplay !== 'Accepted') continue;

    const isTargetMatch = Boolean(activeQuestion) && submission.titleSlug === activeQuestion.titleSlug;
    const isDailyMatch = Boolean(dailyChallenge) && submission.titleSlug === dailyChallenge.titleSlug;

    let submissionDoc;
    try {
      submissionDoc = await Submission.create({
        chatId: group.chatId,
        telegramUserId: member.telegramUserId,
        titleSlug: submission.titleSlug,
        timestamp: submission.timestamp,
        statusDisplay: submission.statusDisplay,
        wasTargetMatch: isTargetMatch,
      });
    } catch (err) {
      if (err.code === DUPLICATE_KEY_ERROR) {
        continue; // already processed in a prior (possibly crashed) cycle
      }
      throw err;
    }

    if (isTargetMatch) {
      const alreadyCompleted = member.completedQuestionIds.some((id) => String(id) === String(activeQuestion._id));
      if (!alreadyCompleted) {
        member.completedQuestionIds.push(activeQuestion._id);
        member.currentStreak += 1;
        member.longestStreak = Math.max(member.longestStreak, member.currentStreak);
        member.lastCompletedAt = new Date();

        const mention = member.telegramUsername ? `@${member.telegramUsername}` : (member.firstName || 'Someone');
        await safeSendMessage(
          telegram,
          group.chatId,
          `🎉 ${escapeHtml(mention)} just solved <b>${escapeHtml(activeQuestion.title)}</b>! Streak: 🔥${member.currentStreak}`,
          { parse_mode: 'HTML' },
        );
        submissionDoc.celebrated = true;
        await submissionDoc.save();
      }
    } else if (isDailyMatch && group.bonusDailyChallengeEnabled) {
      const mention = member.telegramUsername ? `@${member.telegramUsername}` : (member.firstName || 'Someone');
      await safeSendMessage(
        telegram,
        group.chatId,
        `⭐ ${escapeHtml(mention)} knocked out today's LeetCode Daily Challenge too! Bonus points.`,
        { parse_mode: 'HTML' },
      );
      submissionDoc.celebrated = true;
      await submissionDoc.save();
    }
  }

  member.lastSeenSubmissionTimestamp = maxTimestamp;
  await member.save();
}

async function processGroup(telegram, dailyChallenge, group) {
  const activeQuestion = roadmapService.getActiveQuestion(group);
  const members = await Member.find({ chatId: group.chatId, isActive: true });
  if (!members.length) return;

  await runAllSettled(
    members,
    (member) => processMember(telegram, group, activeQuestion, dailyChallenge, member),
    { label: `poll:${group.chatId}` },
  );
}

async function runPollCron(telegram) {
  const dailyChallengeDoc = await getOrFetchDailyChallenge();
  const dailyChallenge = dailyChallengeDoc
    ? { titleSlug: dailyChallengeDoc.titleSlug, title: dailyChallengeDoc.title }
    : null;

  const groups = await Group.find({ isActive: true, 'modules.0': { $exists: true } });
  const summary = await runAllSettled(
    groups,
    (group) => processGroup(telegram, dailyChallenge, group),
    { label: 'poll' },
  );
  logger.info('poll cron summary:', summary);
  return summary;
}

module.exports = { runPollCron };
