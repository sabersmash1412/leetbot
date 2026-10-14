const { test } = require('node:test');
const assert = require('node:assert');
const roadmapService = require('../src/services/roadmapService');

function makeGroup(modules) {
  return {
    modules,
    activeModuleIndex: 0,
    activeQuestionIndex: 0,
    cycleComplete: false,
  };
}

function q(title) {
  return { title, titleSlug: title.toLowerCase().replace(/\s+/g, '-'), url: `https://leetcode.com/problems/${title}/` };
}

test('advancePointer moves to next question within the same module', () => {
  const group = makeGroup([
    { name: 'Mod A', questions: [q('one'), q('two'), q('three')] },
  ]);
  roadmapService.advancePointer(group);
  assert.strictEqual(group.activeModuleIndex, 0);
  assert.strictEqual(group.activeQuestionIndex, 1);
});

test('advancePointer rolls over into the next module', () => {
  const group = makeGroup([
    { name: 'Mod A', questions: [q('one')] },
    { name: 'Mod B', questions: [q('two')] },
  ]);
  roadmapService.advancePointer(group);
  assert.strictEqual(group.activeModuleIndex, 1);
  assert.strictEqual(group.activeQuestionIndex, 0);
});

test('advancePointer sets cycleComplete after the last question of the last module', () => {
  const group = makeGroup([
    { name: 'Mod A', questions: [q('one')] },
  ]);
  roadmapService.advancePointer(group);
  assert.strictEqual(group.cycleComplete, true);
});

test('advancePointer skips an empty next module and completes the cycle if nothing follows', () => {
  const group = makeGroup([
    { name: 'Mod A', questions: [q('one')] },
    { name: 'Mod B (empty)', questions: [] },
  ]);
  roadmapService.advancePointer(group);
  assert.strictEqual(group.cycleComplete, true);
});

test('advancePointer is a no-op once cycleComplete is true', () => {
  const group = makeGroup([{ name: 'Mod A', questions: [q('one')] }]);
  group.cycleComplete = true;
  group.activeModuleIndex = 5;
  group.activeQuestionIndex = 9;
  roadmapService.advancePointer(group);
  assert.strictEqual(group.activeModuleIndex, 5);
  assert.strictEqual(group.activeQuestionIndex, 9);
});

test('getActiveQuestion returns null when cycleComplete', () => {
  const group = makeGroup([{ name: 'Mod A', questions: [q('one')] }]);
  group.cycleComplete = true;
  assert.strictEqual(roadmapService.getActiveQuestion(group), null);
});

test('getActiveQuestion returns null for an empty roadmap', () => {
  const group = makeGroup([]);
  assert.strictEqual(roadmapService.getActiveQuestion(group), null);
});

test('getActiveQuestion returns the current question object', () => {
  const group = makeGroup([{ name: 'Mod A', questions: [q('one'), q('two')] }]);
  group.activeQuestionIndex = 1;
  assert.strictEqual(roadmapService.getActiveQuestion(group).title, 'two');
});

test('addModule appends with correct order', () => {
  const group = makeGroup([]);
  roadmapService.addModule(group, 'First');
  roadmapService.addModule(group, 'Second');
  assert.strictEqual(group.modules.length, 2);
  assert.strictEqual(group.modules[0].order, 0);
  assert.strictEqual(group.modules[1].order, 1);
});

test('addQuestion extracts titleSlug from URL', () => {
  const group = makeGroup([{ name: 'Mod A', order: 0, questions: [] }]);
  roadmapService.addQuestion(group, 0, 'Two Sum', 'https://leetcode.com/problems/two-sum/', 'user123');
  assert.strictEqual(group.modules[0].questions[0].titleSlug, 'two-sum');
});

test('addQuestion throws on out-of-range module index', () => {
  const group = makeGroup([{ name: 'Mod A', order: 0, questions: [] }]);
  assert.throws(() => roadmapService.addQuestion(group, 5, 'Two Sum', 'https://leetcode.com/problems/two-sum/', 'u'));
});

test('loadPreset replaces modules and resets the pointer', () => {
  const group = makeGroup([{ name: 'Old', questions: [q('old-one')] }]);
  group.activeModuleIndex = 3;
  group.activeQuestionIndex = 7;
  group.cycleComplete = true;

  const preset = {
    name: 'test-preset',
    modules: [
      { name: 'New Mod', questions: [{ title: 'New Q', url: 'https://leetcode.com/problems/new-q/' }] },
    ],
  };
  roadmapService.loadPreset(group, preset);

  assert.strictEqual(group.modules.length, 1);
  assert.strictEqual(group.modules[0].name, 'New Mod');
  assert.strictEqual(group.modules[0].questions[0].titleSlug, 'new-q');
  assert.strictEqual(group.activeModuleIndex, 0);
  assert.strictEqual(group.activeQuestionIndex, 0);
  assert.strictEqual(group.cycleComplete, false);
  assert.strictEqual(group.presetName, 'test-preset');
});

test('countTotalQuestions sums across all modules', () => {
  const group = makeGroup([
    { name: 'A', questions: [q('one'), q('two')] },
    { name: 'B', questions: [q('three')] },
  ]);
  assert.strictEqual(roadmapService.countTotalQuestions(group), 3);
});
