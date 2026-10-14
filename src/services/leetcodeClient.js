const logger = require('../utils/logger');

const GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql';
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Low-level GraphQL request. Never throws — returns { ok, data } or { ok: false, error }.
 * LeetCode's endpoint is unofficial/undocumented: it can return HTTP 200 with a GraphQL
 * `errors` array, so both HTTP status and the errors field must be checked.
 */
async function graphqlRequest(query, variables) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://leetcode.com',
        'User-Agent': 'Mozilla/5.0 (compatible; LeetBotStudyGroup/1.0)',
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, error: { type: 'http', status: response.status, message: `LeetCode API returned HTTP ${response.status}` } };
    }

    const json = await response.json();
    if (json.errors && json.errors.length > 0) {
      return { ok: false, error: { type: 'graphql', message: json.errors.map((e) => e.message).join('; ') } };
    }

    return { ok: true, data: json.data };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, error: { type: 'timeout', message: 'LeetCode API request timed out' } };
    }
    return { ok: false, error: { type: 'network', message: err.message } };
  } finally {
    clearTimeout(timeout);
  }
}

const RECENT_AC_SUBMISSIONS_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
      statusDisplay
      lang
    }
  }
`;

const DAILY_CHALLENGE_QUERY = `
  query activeDailyCodingChallenge {
    activeDailyCodingChallengeQuestion {
      date
      link
      question {
        questionFrontendId
        title
        titleSlug
        difficulty
      }
    }
  }
`;

const USER_PROFILE_QUERY = `
  query userPublicProfile($username: String!) {
    matchedUser(username: $username) {
      username
    }
  }
`;

/**
 * Returns { ok: true, submissions: [...] } with timestamps parsed to Number,
 * or { ok: false, error }. An empty array means no recent activity or a
 * private/non-existent profile — treated as "nothing new," not an error.
 */
async function getRecentAcSubmissions(username, limit = 20) {
  const result = await graphqlRequest(RECENT_AC_SUBMISSIONS_QUERY, { username, limit });
  if (!result.ok) {
    logger.warn(`getRecentAcSubmissions(${username}) failed:`, result.error.message);
    return result;
  }

  const list = (result.data && result.data.recentAcSubmissionList) || [];
  const submissions = list.map((s) => ({
    ...s,
    timestamp: parseInt(s.timestamp, 10),
  }));
  return { ok: true, submissions };
}

/**
 * Returns { ok: true, challenge: { date, titleSlug, title, link } } or { ok: false, error }.
 */
async function getDailyChallenge() {
  const result = await graphqlRequest(DAILY_CHALLENGE_QUERY, {});
  if (!result.ok) {
    logger.warn('getDailyChallenge failed:', result.error.message);
    return result;
  }

  const node = result.data && result.data.activeDailyCodingChallengeQuestion;
  if (!node) {
    return { ok: false, error: { type: 'empty', message: 'No active daily challenge returned' } };
  }

  return {
    ok: true,
    challenge: {
      date: node.date,
      titleSlug: node.question.titleSlug,
      title: node.question.title,
      link: node.link,
    },
  };
}

/**
 * Returns { ok: true, exists: boolean }. ok:false only on transport failure.
 *
 * Note: LeetCode's API returns a GraphQL error ("That user does not exist.")
 * with HTTP 200 for an unknown username, rather than a null `matchedUser` —
 * that specific error is treated as a valid "doesn't exist" result, not a
 * transport failure.
 */
async function validateUsername(username) {
  const result = await graphqlRequest(USER_PROFILE_QUERY, { username });
  if (!result.ok) {
    if (result.error.type === 'graphql' && /does not exist/i.test(result.error.message)) {
      return { ok: true, exists: false };
    }
    logger.warn(`validateUsername(${username}) failed:`, result.error.message);
    return result;
  }
  return { ok: true, exists: Boolean(result.data && result.data.matchedUser) };
}

module.exports = {
  getRecentAcSubmissions,
  getDailyChallenge,
  validateUsername,
};
