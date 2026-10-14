const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function currentLevel() {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return LEVELS[level] !== undefined ? LEVELS[level] : LEVELS.info;
}

function log(level, ...args) {
  if (LEVELS[level] > currentLevel()) return;
  const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(prefix, ...args);
}

module.exports = {
  error: (...args) => log('error', ...args),
  warn: (...args) => log('warn', ...args),
  info: (...args) => log('info', ...args),
  debug: (...args) => log('debug', ...args),
};
