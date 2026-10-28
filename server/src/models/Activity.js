import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    habitId: { type: String, default: null },
    habitName: { type: String, required: true, maxlength: 120 },
    habitCategory: { type: String, default: 'Other' },
    habitIcon: { type: String, default: '✅' },
    type: {
      type: String,
      enum: ['habit_created', 'habit_completed', 'habit_uncompleted', 'habit_edited', 'habit_deleted', 'habit_status_changed', 'daily_goal_achieved', 'streak_milestone'],
      required: true,
    },
    description: { type: String, required: true, maxlength: 240 },
    occurredAt: { type: Date, default: Date.now, index: true },
    idempotencyKey: { type: String, default: undefined },
  },
  { timestamps: true }
);

activitySchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);
activitySchema.index({ userId: 1, occurredAt: -1 });

export default mongoose.models.Activity || mongoose.model('Activity', activitySchema);
