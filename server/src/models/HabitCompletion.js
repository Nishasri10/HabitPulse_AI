import mongoose from 'mongoose';

const habitCompletionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    habitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true, index: true },
    localDateKey: { type: String, required: true, index: true },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

habitCompletionSchema.index({ userId: 1, habitId: 1, localDateKey: 1 }, { unique: true });

export default mongoose.models.HabitCompletion || mongoose.model('HabitCompletion', habitCompletionSchema);
