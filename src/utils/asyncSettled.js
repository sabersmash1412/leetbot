const logger = require('./logger');

/**
 * Runs `items.map(fn)` via Promise.allSettled and logs rejections instead of
 * letting one failure abort the whole batch. Returns { succeeded, failed } counts.
 */
async function runAllSettled(items, fn, { label = 'batch' } = {}) {
  const results = await Promise.allSettled(items.map((item) => fn(item)));
  let succeeded = 0;
  let failed = 0;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      succeeded += 1;
    } else {
      failed += 1;
      logger.error(`[${label}] item ${index} failed:`, result.reason && result.reason.message ? result.reason.message : result.reason);
    }
  });
  return { succeeded, failed, total: items.length };
}

module.exports = { runAllSettled };
