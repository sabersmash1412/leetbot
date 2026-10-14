const express = require('express');
const config = require('../config');
const logger = require('../utils/logger');
const { runMorningCron } = require('../services/morningService');
const { runPollCron } = require('../services/pollingService');
const { runEveningCron } = require('../services/eveningService');

function requireCronSecret(req, res, next) {
  const provided = req.query.key || req.headers['x-cron-secret'];
  if (provided !== config.cronSecret) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }
  next();
}

function createCronRouter(bot) {
  const router = express.Router();
  router.use(requireCronSecret);

  router.get('/morning', async (req, res) => {
    try {
      const summary = await runMorningCron(bot.telegram);
      res.json({ ok: true, summary });
    } catch (err) {
      logger.error('cron/morning failed:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/poll', async (req, res) => {
    try {
      const summary = await runPollCron(bot.telegram);
      res.json({ ok: true, summary });
    } catch (err) {
      logger.error('cron/poll failed:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/evening', async (req, res) => {
    try {
      const summary = await runEveningCron(bot.telegram);
      res.json({ ok: true, summary });
    } catch (err) {
      logger.error('cron/evening failed:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

module.exports = { createCronRouter };
