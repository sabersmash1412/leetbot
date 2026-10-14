const Group = require('../models/Group');
const { extractTitleSlug } = require('../utils/leetcodeUrl');

/**
 * Finds or creates the Group doc for a chat. Does not populate a roadmap.
 */
async function getOrCreateGroup(chatId, chatTitle) {
  let group = await Group.findOne({ chatId: String(chatId) });
  if (!group) {
    group = await Group.create({ chatId: String(chatId), chatTitle });
  } else if (chatTitle && group.chatTitle !== chatTitle) {
    group.chatTitle = chatTitle;
    await group.save();
  }
  return group;
}

function addModule(group, name) {
  const order = group.modules.length;
  group.modules.push({ name, order, questions: [] });
  return group.modules[group.modules.length - 1];
}

/**
 * Adds a question to modules[moduleIndex]. moduleIndex is 0-based.
 * Throws if the module index is out of range or the URL is invalid.
 */
function addQuestion(group, moduleIndex, title, url, addedBy) {
  if (moduleIndex < 0 || moduleIndex >= group.modules.length) {
    throw new Error(`Module #${moduleIndex + 1} doesn't exist. This roadmap has ${group.modules.length} module(s).`);
  }
  const titleSlug = extractTitleSlug(url);
  const question = { title, titleSlug, url, addedBy, addedAt: new Date() };
  group.modules[moduleIndex].questions.push(question);
  return question;
}

/**
 * Returns the currently active question object, or null if there is none yet
 * (empty roadmap) or the roadmap has been fully completed.
 */
function getActiveQuestion(group) {
  if (group.cycleComplete) return null;
  const module = group.modules[group.activeModuleIndex];
  if (!module) return null;
  const question = module.questions[group.activeQuestionIndex];
  return question || null;
}

/**
 * Advances the (activeModuleIndex, activeQuestionIndex) pointer by one question,
 * rolling over into the next module as needed. Sets cycleComplete if the walk
 * runs past the last question of the last module. Mutates `group` in place but
 * does not save it.
 *
 * Time-boxed design: this always advances, regardless of whether anyone has
 * completed the current question.
 */
function advancePointer(group) {
  if (group.cycleComplete) return;

  const currentModule = group.modules[group.activeModuleIndex];
  if (!currentModule) {
    group.cycleComplete = true;
    return;
  }

  const nextQuestionIndex = group.activeQuestionIndex + 1;
  if (nextQuestionIndex < currentModule.questions.length) {
    group.activeQuestionIndex = nextQuestionIndex;
    return;
  }

  const nextModuleIndex = group.activeModuleIndex + 1;
  if (nextModuleIndex < group.modules.length && group.modules[nextModuleIndex].questions.length > 0) {
    group.activeModuleIndex = nextModuleIndex;
    group.activeQuestionIndex = 0;
    return;
  }

  // Walked past the last question of the last non-empty module.
  group.cycleComplete = true;
}

/**
 * Replaces group.modules wholesale from a preset definition and resets the
 * campaign pointer. Does not save.
 */
function loadPreset(group, preset) {
  group.modules = preset.modules.map((mod, index) => ({
    name: mod.name,
    order: index,
    questions: mod.questions.map((q) => ({
      title: q.title,
      titleSlug: extractTitleSlug(q.url),
      url: q.url,
    })),
  }));
  group.activeModuleIndex = 0;
  group.activeQuestionIndex = 0;
  group.activeQuestionSetAt = null;
  group.cycleComplete = false;
  group.cycleCompleteAnnounced = false;
  group.presetName = preset.name;
}

function countTotalQuestions(group) {
  return group.modules.reduce((sum, m) => sum + m.questions.length, 0);
}

module.exports = {
  getOrCreateGroup,
  addModule,
  addQuestion,
  getActiveQuestion,
  advancePointer,
  loadPreset,
  countTotalQuestions,
};
