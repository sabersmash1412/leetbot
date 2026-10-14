const { Schema, model } = require('mongoose');

const SubmissionSchema = new Schema({
  chatId: { type: String, required: true, index: true },
  telegramUserId: { type: String, required: true },
  titleSlug: { type: String, required: true },
  timestamp: { type: Number, required: true },
  statusDisplay: { type: String },
  wasTargetMatch: { type: Boolean, default: false },
  celebrated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

SubmissionSchema.index(
  { chatId: 1, telegramUserId: 1, titleSlug: 1, timestamp: 1 },
  { unique: true },
);

module.exports = model('Submission', SubmissionSchema);
