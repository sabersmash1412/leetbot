const SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * Extracts the titleSlug from a LeetCode problem URL, e.g.
 *   https://leetcode.com/problems/two-sum/            -> "two-sum"
 *   https://leetcode.com/problems/two-sum/description/ -> "two-sum"
 * Throws a descriptive Error if the URL doesn't look like a LeetCode problem link.
 */
function extractTitleSlug(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('That doesn\'t look like a valid URL.');
  }

  if (!/leetcode\.com$/i.test(parsed.hostname.replace(/^www\./i, ''))) {
    throw new Error('That doesn\'t look like a leetcode.com URL.');
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  const problemsIndex = segments.indexOf('problems');
  if (problemsIndex === -1 || !segments[problemsIndex + 1]) {
    throw new Error('That doesn\'t look like a valid LeetCode problem URL (expected .../problems/<slug>/...).');
  }

  const slug = segments[problemsIndex + 1];
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`Couldn't parse a valid problem slug from that URL (got "${slug}").`);
  }

  return slug;
}

module.exports = { extractTitleSlug };
