import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    category: {
      type: String,
      enum: ['Health', 'Fitness', 'Learning', 'Productivity', 'Mindfulness', 'Personal Growth', 'Other'],
      default: 'Other',
    },
    frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
    scheduledWeekdays: [{ type: Number, min: 0, max: 6 }],
    targetCount: { type: Number, min: 1, max: 10, default: 1 },
    startDate: { type: Date, required: true },
    reminderTime: { type: String, default: '09:00' },
    timezone: { type: String, default: 'UTC' },
    color: { type: String, default: '#8B80C5' },
    icon: { type: String, default: '✅' },
    creationKey: { type: String, default: undefined, select: false },
    status: { type: String, enum: ['active', 'paused'], default: 'active' },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

habitSchema.index({ userId: 1, status: 1, archivedAt: 1 });
habitSchema.index(
  { userId: 1, creationKey: 1 },
  { unique: true, partialFilterExpression: { creationKey: { $type: 'string' } } }
);

export default mongoose.models.Habit || mongoose.model('Habit', habitSchema);
