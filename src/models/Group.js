const { Schema, model } = require('mongoose');

const QuestionSchema = new Schema(
  {
    title: { type: String, required: true },
    titleSlug: { type: String, required: true },
    url: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', 'Unknown'], default: 'Unknown' },
    addedBy: { type: String },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const ModuleSchema = new Schema(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    questions: [QuestionSchema],
  },
  { _id: true },
);

const GroupSchema = new Schema(
  {
    chatId: { type: String, required: true, unique: true, index: true },
    chatTitle: { type: String },
    modules: [ModuleSchema],

    // campaign progress pointer
    activeModuleIndex: { type: Number, default: 0 },
    activeQuestionIndex: { type: Number, default: 0 },
    activeQuestionSetAt: { type: Date, default: null },
    cycleComplete: { type: Boolean, default: false },
    cycleCompleteAnnounced: { type: Boolean, default: false },

    // config
    bonusDailyChallengeEnabled: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    presetName: { type: String, default: null },

    // idempotency guards against a double-firing external cron pinger
    lastMorningRunDate: { type: String, default: null },
    lastEveningRunDate: { type: String, default: null },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

GroupSchema.index({ isActive: 1 });

module.exports = model('Group', GroupSchema);
