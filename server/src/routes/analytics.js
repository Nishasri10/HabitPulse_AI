import express from 'express';
import { getHabitsByUser, getCompletionsForUser, getActivitiesByUser } from '../data/store.js';
import { computeCurrentStreak, computeLongestStreak, getDateKey, isHabitScheduledOnDate } from '../utils/streak.js';

const router = express.Router();

const buildHabitMix = (habits) => {
  const counts = new Map();

  for (const habit of habits) {
    const category = habit.category || 'Other';
    counts.set(category, (counts.get(category) || 0) + 1);
  }

  return [...counts.entries()].map(([name, value]) => ({ name, value }));
};

const buildCompletionTrend = (completions) => {
  const entries = new Map();

  for (const completion of completions) {
    const key = completion.localDateKey;
    entries.set(key, (entries.get(key) || 0) + 1);
  }

  const trend = [];
  const today = new Date();

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - index);
    const key = getDateKey(date, 'UTC');
    const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    trend.push({
      name: dayLabel,
      value: entries.get(key) || 0,
    });
  }

  return trend;
};

const buildDashboardSummary = (habits, completions, activities = []) => {
  const sorted = [...habits].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  const activeHabits = sorted.filter((habit) => habit.status === 'active' && !habit.archivedAt);
  const today = new Date();

  const completionMap = new Map();
  for (const entry of completions) {
    completionMap.set(`${String(entry.habitId)}:${entry.localDateKey}`, entry);
  }

  const summaryByHabit = activeHabits.map((habit) => {
    const habitCompletionKeys = completions
      .filter((entry) => String(entry.habitId) === String(habit._id))
      .map((entry) => entry.localDateKey);

    const todayKey = getDateKey(today, habit.timezone || 'UTC');
    const scheduledToday = isHabitScheduledOnDate(habit, today, habit.timezone || 'UTC');

    return {
      habit,
      currentStreak: computeCurrentStreak(habit, habitCompletionKeys, today, habit.timezone || 'UTC'),
      longestStreak: computeLongestStreak(habit, habitCompletionKeys, habit.timezone || 'UTC'),
      completedToday: scheduledToday && completionMap.has(`${String(habit._id)}:${todayKey}`),
      completionRate: 0,
    };
  });

  const scheduledToday = activeHabits.filter((habit) => isHabitScheduledOnDate(habit, today, habit.timezone || 'UTC'));
  const completedToday = summaryByHabit.filter((item) => item.completedToday).length;
  const dailyCompletion = scheduledToday.length ? Math.round((completedToday / scheduledToday.length) * 100) : 0;

  const habitMix = buildHabitMix(activeHabits);
  const completionTrend = buildCompletionTrend(completions);
  const performanceData = activeHabits.map((habit) => ({
    name: habit.name,
    value: completions.filter((entry) => String(entry.habitId) === String(habit._id)).length,
    category: habit.category || 'Other',
  }));

  return {
    stats: {
      activeHabits: activeHabits.length,
      completedToday,
      dailyCompletion,
      currentStreak: Math.max(...summaryByHabit.map((item) => item.currentStreak), 0),
      longestStreak: Math.max(...summaryByHabit.map((item) => item.longestStreak), 0),
    },
    chartData: performanceData,
    completionTrend,
    habitMix,
    recentActivity: activities,
    checklist: activeHabits.map((habit) => ({
      id: habit._id,
      name: habit.name,
      completed: completionMap.has(`${String(habit._id)}:${getDateKey(today, habit.timezone || 'UTC')}`) && isHabitScheduledOnDate(habit, today, habit.timezone || 'UTC'),
      category: habit.category,
      color: habit.color,
      icon: habit.icon,
      currentStreak: summaryByHabit.find((item) => String(item.habit._id) === String(habit._id))?.currentStreak || 0,
    })),
  };
};

router.get('/dashboard', async (req, res) => {
  const habits = await getHabitsByUser(req.user.id);
  const completions = await getCompletionsForUser(req.user.id);
  const activities = await getActivitiesByUser(req.user.id, 10);
  return res.json(buildDashboardSummary(habits, completions, activities));
});

router.get('/summary', async (req, res) => {
  const habits = await getHabitsByUser(req.user.id);
  const completions = await getCompletionsForUser(req.user.id);
  const activities = await getActivitiesByUser(req.user.id, 10);
  const summary = buildDashboardSummary(habits, completions, activities);

  return res.json({
    habits,
    completions,
    total: habits.length,
    ...summary,
    habitMix: summary.habitMix,
    completionTrend: summary.completionTrend,
  });
});

export default router;
