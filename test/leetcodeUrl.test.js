const { test } = require('node:test');
const assert = require('node:assert');
const { extractTitleSlug } = require('../src/utils/leetcodeUrl');

test('extracts slug from a plain problem URL', () => {
  assert.strictEqual(extractTitleSlug('https://leetcode.com/problems/two-sum/'), 'two-sum');
});

test('extracts slug from a URL with trailing description segment', () => {
  assert.strictEqual(extractTitleSlug('https://leetcode.com/problems/two-sum/description/'), 'two-sum');
});

test('extracts slug without trailing slash', () => {
  assert.strictEqual(extractTitleSlug('https://leetcode.com/problems/two-sum'), 'two-sum');
});

test('works with www subdomain', () => {
  assert.strictEqual(extractTitleSlug('https://www.leetcode.com/problems/valid-anagram/'), 'valid-anagram');
});

test('rejects a non-leetcode URL', () => {
  assert.throws(() => extractTitleSlug('https://example.com/problems/two-sum/'));
});

test('rejects a malformed URL', () => {
  assert.throws(() => extractTitleSlug('not a url'));
});

test('rejects a leetcode URL without /problems/', () => {
  assert.throws(() => extractTitleSlug('https://leetcode.com/discuss/12345/'));
});
