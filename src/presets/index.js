const blind75 = require('./blind75.json');
const neetcode150 = require('./neetcode150.json');
const grind75 = require('./grind75.json');
const topInterview150 = require('./top-interview-150.json');

const presets = {
  blind75,
  neetcode150,
  grind75,
  'top-interview-150': topInterview150,
};

function listPresets() {
  return Object.values(presets).map((p) => ({
    name: p.name,
    displayName: p.displayName,
    moduleCount: p.modules.length,
    questionCount: p.modules.reduce((sum, m) => sum + m.questions.length, 0),
  }));
}

function getPreset(name) {
  return presets[name] || null;
}

module.exports = { listPresets, getPreset };
