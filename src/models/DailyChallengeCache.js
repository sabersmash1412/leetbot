const { Schema, model } = require('mongoose');

const DailyChallengeCacheSchema = new Schema({
  date: { type: String, required: true, unique: true }, // 'YYYY-MM-DD'
  titleSlug: { type: String, required: true },
  title: { type: String },
  link: { type: String },
  fetchedAt: { type: Date, default: Date.now },
});

module.exports = model('DailyChallengeCache', DailyChallengeCacheSchema);
