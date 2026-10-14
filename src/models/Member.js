const { Schema, model } = require('mongoose');

const MemberSchema = new Schema(
  {
    chatId: { type: String, required: true, index: true },
    telegramUserId: { type: String, required: true },
    telegramUsername: { type: String },
    firstName: { type: String },
    leetcodeUsername: { type: String, required: true },

    completedQuestionIds: [{ type: Schema.Types.ObjectId }],
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCompletedAt: { type: Date, default: null },
    lastSeenSubmissionTimestamp: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

MemberSchema.index({ chatId: 1, telegramUserId: 1 }, { unique: true });
MemberSchema.index({ chatId: 1, isActive: 1 });

module.exports = model('Member', MemberSchema);
