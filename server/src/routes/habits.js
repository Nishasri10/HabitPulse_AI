import express from 'express';
import { habitSchema, isValidObjectId } from '../utils/validation.js';
import { createHabit, getHabitsByUser, getHabitById, updateHabit, deleteHabit, findCompletion, createCompletion, removeCompletion, getCompletionsForUser, getCompletionsForHabit, createActivity } from '../data/store.js';
import { computeCurrentStreak, getDateKey, isHabitScheduledOnDate } from '../utils/streak.js';

const router = express.Router();
const activityKey = (req, type) => {
  const requestKey = req.get('Idempotency-Key');
  return requestKey ? `${requestKey}:${type}` : undefined;
};

const recordActivity = async (req, { type, habit, description, idempotencyKey }) => createActivity({
  userId: req.user.id,
  habitId: habit?._id ? String(habit._id) : null,
  habitName: habit?.name || 'Habit',
  habitCategory: habit?.category || 'Other',
  habitIcon: habit?.icon || '✅',
  type,
  description,
  idempotencyKey: idempotencyKey || activityKey(req, type),
});

const getCompletionDateKey = (date, timezone) => {
  const dt = new Date(date);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(dt);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
};

router.get('/', async (req, res) => {
  const habits = await getHabitsByUser(req.user.id);
  const completions = await getCompletionsForUser(req.user.id);
  const completionMap = new Map();
  completions.forEach((c) => completionMap.set(`${c.habitId}:${c.localDateKey}`, c));
  return res.json({ habits, completionMap: Object.fromEntries(completionMap.entries()) });
});

router.post('/', async (req, res) => {
  try {
    const parsed = habitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid habit payload.', errors: parsed.error.flatten() });
    const payload = parsed.data;
    const requestKey = req.get('Idempotency-Key');
    const habit = await createHabit({
      ...payload,
      userId: req.user.id,
      creationKey: requestKey ? String(requestKey).slice(0, 120) : undefined,
      startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
    });
    await recordActivity(req, { type: 'habit_created', habit, description: `Created habit: ${habit.name}` });
    return res.status(201).json({ habit });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create habit.' });
  }
});

router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid habit id.' });
  const habit = await getHabitById(req.params.id);
  if (!habit || String(habit.userId) !== String(req.user.id)) return res.status(404).json({ message: 'Habit not found.' });
  return res.json({ habit });
});

router.put('/:id', async (req, res) => {
  const habit = await getHabitById(req.params.id);
  if (!habit || String(habit.userId) !== String(req.user.id)) return res.status(404).json({ message: 'Habit not found.' });
  const parsed = habitSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid habit update payload.' });
  const updated = await updateHabit(req.params.id, { ...parsed.data, startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : habit.startDate });
  await recordActivity(req, { type: 'habit_edited', habit: updated, description: `Updated habit: ${updated.name}` });
  return res.json({ habit: updated });
});

router.delete('/:id', async (req, res) => {
  const habit = await getHabitById(req.params.id);
  if (!habit || String(habit.userId) !== String(req.user.id)) return res.status(404).json({ message: 'Habit not found.' });
  await recordActivity(req, { type: 'habit_deleted', habit, description: `Deleted habit: ${habit.name}` });
  await deleteHabit(req.params.id);
  return res.json({ message: 'Habit deleted.' });
});

router.patch('/:id/status', async (req, res) => {
  const { status, archivedAt } = req.body || {};
  const habit = await getHabitById(req.params.id);
  if (!habit || String(habit.userId) !== String(req.user.id)) return res.status(404).json({ message: 'Habit not found.' });
  const update = {};
  if (status) update.status = status;
  if (archivedAt !== undefined) update.archivedAt = archivedAt ? new Date(archivedAt) : null;
  const updated = await updateHabit(req.params.id, update);
  if (status && status !== habit.status) {
    const action = status === 'paused' ? 'Paused' : 'Resumed';
    await recordActivity(req, { type: 'habit_status_changed', habit: updated, description: `${action} habit: ${updated.name}` });
  }
  return res.json({ habit: updated });
});

router.post('/:id/complete', async (req, res) => {
  const { date } = req.body || {};
  const habit = await getHabitById(req.params.id);
  if (!habit || String(habit.userId) !== String(req.user.id)) return res.status(404).json({ message: 'Habit not found.' });

  const targetDate = date ? new Date(date) : new Date();
  const localKey = getCompletionDateKey(targetDate, habit.timezone || 'UTC');
  const existing = await findCompletion(req.params.id, localKey);
  if (existing) return res.status(409).json({ message: 'This habit is already completed for that date.' });

  const completion = await createCompletion({ userId: req.user.id, habitId: req.params.id, localDateKey: localKey, completedAt: targetDate });
  await recordActivity(req, { type: 'habit_completed', habit, description: `Completed habit: ${habit.name}` });

  const todayKey = getDateKey(new Date(), habit.timezone || 'UTC');
  if (localKey === todayKey) {
    const habitCompletions = await getCompletionsForHabit(req.params.id);
    const currentStreak = computeCurrentStreak(
      habit,
      habitCompletions.map((entry) => entry.localDateKey),
      new Date(),
      habit.timezone || 'UTC'
    );
    if ([7, 14, 30, 50, 100].includes(currentStreak)) {
      await recordActivity(req, {
        type: 'streak_milestone',
        habit,
        description: `Reached a ${currentStreak}-day streak for ${habit.name}`,
        idempotencyKey: `milestone:${habit._id}:${todayKey}:${currentStreak}`,
      });
    }

    const userHabits = (await getHabitsByUser(req.user.id)).filter(
      (item) => item.status === 'active' && !item.archivedAt && isHabitScheduledOnDate(item, new Date(), item.timezone || 'UTC')
    );
    const userCompletions = await getCompletionsForUser(req.user.id);
    const completedToday = userHabits.every((item) => {
      const dateKey = getDateKey(new Date(), item.timezone || 'UTC');
      return userCompletions.some(
        (entry) => String(entry.habitId) === String(item._id) && entry.localDateKey === dateKey
      );
    });

    if (userHabits.length > 0 && completedToday) {
      await recordActivity(req, {
        type: 'daily_goal_achieved',
        habit: null,
        description: 'Completed every habit scheduled for today',
        idempotencyKey: `daily-goal:${getDateKey(new Date(), 'UTC')}`,
      });
    }
  }
  return res.status(201).json({ completion });
});

router.delete('/:id/complete', async (req, res) => {
  const { date } = req.body || {};
  const habit = await getHabitById(req.params.id);
  if (!habit || String(habit.userId) !== String(req.user.id)) return res.status(404).json({ message: 'Habit not found.' });

  const targetDate = date ? new Date(date) : new Date();
  const localKey = getCompletionDateKey(targetDate, habit.timezone || 'UTC');
  const existing = await findCompletion(req.params.id, localKey);
  await removeCompletion(req.params.id, localKey);
  if (existing) {
    await recordActivity(req, { type: 'habit_uncompleted', habit, description: `Marked incomplete: ${habit.name}` });
  }
  return res.json({ message: 'Completion removed.' });
});

router.get('/calendar/:date?', async (req, res) => {
  const habits = await getHabitsByUser(req.user.id);
  const monthDate = req.params.date ? new Date(req.params.date) : new Date();
  const completions = await getCompletionsForUser(req.user.id);
  const completionMap = new Map();
  completions.forEach((entry) => completionMap.set(`${entry.habitId}:${entry.localDateKey}`, entry));
  return res.json({ monthDate, habits, completionMap: Object.fromEntries(completionMap.entries()) });
});

export default router;
