const { listPresets, getPreset } = require('../src/presets');
const { extractTitleSlug } = require('../src/utils/leetcodeUrl');

let ok = true;

for (const { name } of listPresets()) {
  const preset = getPreset(name);
  const seenSlugs = new Set();

  if (!preset.modules.length) {
    console.error(`[${name}] has no modules`);
    ok = false;
    continue;
  }

  for (const mod of preset.modules) {
    if (!mod.questions.length) {
      console.error(`[${name}] module "${mod.name}" is empty`);
      ok = false;
    }
    for (const q of mod.questions) {
      let slug;
      try {
        slug = extractTitleSlug(q.url);
      } catch (err) {
        console.error(`[${name}] module "${mod.name}" question "${q.title}" has invalid URL: ${err.message}`);
        ok = false;
        continue;
      }
      if (seenSlugs.has(slug)) {
        console.error(`[${name}] duplicate slug "${slug}" (question "${q.title}")`);
        ok = false;
      }
      seenSlugs.add(slug);
    }
  }

  console.log(`[${name}] ${preset.modules.length} modules, ${seenSlugs.size} unique questions`);
}

if (!ok) {
  console.error('\nPreset validation FAILED');
  process.exit(1);
}
console.log('\nAll presets valid.');
