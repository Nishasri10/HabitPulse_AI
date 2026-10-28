import express from 'express';
import { getHabitsByUser, getCompletionsForUser, getActivitiesByUser, findUserById } from '../data/store.js';
import { getDateKey } from '../utils/streak.js';
import { generateWeeklyReviewGuidance } from '../utils/aiService.js';

const router = express.Router();
const allowedPeriods = new Set(['7', '30', 'all']);
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dateFromKey = (key) => new Date(`${key}T00:00:00.000Z`);
const validDateKey = (key) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const date = dateFromKey(key);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key;
};

const shiftDateKey = (key, amount) => {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

const getWeekStartKey = (key) => shiftDateKey(key, -dateFromKey(key).getUTCDay());

const getWeekdayForDateKey = (key) => dateFromKey(key).getUTCDay();
const isScheduledOnKey = (habit, key) => habit.frequency !== 'weekly'
  || (habit.scheduledWeekdays || []).includes(getWeekdayForDateKey(key));
const getHabitStartKey = (habit) => {
  const startDate = habit.startDate || habit.createdAt;
  if (typeof startDate === 'string') {
    const datePart = startDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (datePart) return datePart;
  }
  return getDateKey(startDate || new Date(), habit.timezone || 'UTC');
};

const buildCompletionHeatmap = (completions, todayKey) => {
  const endKey = getWeekStartKey(todayKey);
  const startKey = shiftDateKey(endKey, -51 * 7);
  const counts = new Map();
  for (const completion of completions) {
    const key = completion.localDateKey;
    if (!validDateKey(key) || key < startKey || key > todayKey) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const days = [];
  for (let key = startKey; key <= todayKey; key = shiftDateKey(key, 1)) {
    days.push({ dateKey: key, count: counts.get(key) || 0 });
  }
  return { startKey, endKey: todayKey, days, hasHistory: days.some((day) => day.count > 0) };
};

const buildAchievements = (habits, completions, todayKey, timezone) => {
  const habitIds = new Set(habits.map((habit) => String(habit._id)));
  const occurrenceKeys = new Set(
    completions
      .filter((completion) => habitIds.has(String(completion.habitId))
        && validDateKey(completion.localDateKey)
        && getCompletionDateKey(completion, timezone) <= todayKey)
      .map((completion) => `${String(completion.habitId)}:${completion.localDateKey}`)
  );
  const total = occurrenceKeys.size;
  const definitions = [
    { id: 'first-completion', title: 'First step', threshold: 1, description: 'Save your first habit completion.' },
    { id: 'seven-completions', title: 'Building momentum', threshold: 7, description: 'Save 7 habit completions.' },
    { id: 'thirty-completions', title: 'Consistent effort', threshold: 30, description: 'Save 30 habit completions.' },
  ];
  return definitions.map((achievement) => ({
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    unlocked: total >= achievement.threshold,
    progress: Math.min(total, achievement.threshold),
    target: achievement.threshold,
  }));
};

const calculateStreaks = (habit, completionKeys, startKey, todayKey) => {
  const completed = new Set(completionKeys);
  let longestStreak = 0;
  let streak = 0;

  for (let key = startKey; key <= todayKey; key = shiftDateKey(key, 1)) {
    if (!isScheduledOnKey(habit, key)) continue;
    if (completed.has(key)) {
      streak += 1;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 0;
    }
  }

  let currentStreak = 0;
  for (let key = todayKey; key >= startKey; key = shiftDateKey(key, -1)) {
    if (!isScheduledOnKey(habit, key)) continue;
    if (!completed.has(key)) break;
    currentStreak += 1;
  }

  return { currentStreak, longestStreak };
};

const buildHabitMix = (habits) => {
  const counts = new Map();
  for (const habit of habits) {
    const category = habit.category || 'Other';
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return [...counts.entries()].map(([name, value]) => ({ name, value }));
};

const getHabitPeriodMetrics = (habit, completions, today, period) => {
  const timezone = habit.timezone || 'UTC';
  const todayKey = getDateKey(today, timezone);
  const habitStartKey = getDateKey(habit.startDate || habit.createdAt || today, timezone);
  const periodStartKey = period === 'all' ? habitStartKey : shiftDateKey(todayKey, -(Number(period) - 1));
  const startKey = periodStartKey > habitStartKey ? periodStartKey : habitStartKey;
  const habitCompletionKeys = completions
    .filter((entry) => String(entry.habitId) === String(habit._id))
    .map((entry) => entry.localDateKey);
  const completionKeys = new Set(habitCompletionKeys);
  let scheduledDays = 0;
  let completedDays = 0;

  for (let key = startKey; key <= todayKey; key = shiftDateKey(key, 1)) {
    if (!isScheduledOnKey(habit, key)) continue;
    scheduledDays += 1;
    if (completionKeys.has(key)) completedDays += 1;
  }

  const streaks = calculateStreaks(habit, habitCompletionKeys, habitStartKey, todayKey);
  return {
    scheduledDays,
    completedDays,
    completionRate: scheduledDays ? Math.round((completedDays / scheduledDays) * 100) : null,
    ...streaks,
    periodStartKey: startKey,
    todayKey,
  };
};

const getCompletionDateKey = (completion, timezone) => {
  if (completion.completedAt) return getDateKey(completion.completedAt, timezone);
  return completion.localDateKey;
};

const buildCompletionTrend = (completions, todayKey, timezone, period, startKey) => {
  const grouped = new Map();
  const currentWeekStart = getWeekStartKey(todayKey);
  const trendStart = period === 'all' ? startKey : shiftDateKey(todayKey, -(Number(period) - 1));

  for (const completion of completions) {
    const key = getCompletionDateKey(completion, timezone);
    if (key < trendStart || key > todayKey) continue;
    const bucket = period === 'all' ? getWeekStartKey(key) : key;
    grouped.set(bucket, (grouped.get(bucket) || 0) + 1);
  }

  if (period === 'all') {
    if (!grouped.size) return [];
    const firstWeek = getWeekStartKey(trendStart);
    const trend = [];
    for (let key = firstWeek; key <= currentWeekStart; key = shiftDateKey(key, 7)) {
      const formatted = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
        .format(dateFromKey(key));
      trend.push({
        dateKey: key,
        label: formatted,
        value: grouped.get(key) || 0,
      });
    }
    return trend;
  }

  const trend = [];
  for (let key = trendStart; key <= todayKey; key = shiftDateKey(key, 1)) {
    const day = getWeekdayForDateKey(key);
    const label = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(dateFromKey(key));
    trend.push({
      dateKey: key,
      label,
      day: dayLabels[day],
      isToday: key === todayKey,
      value: grouped.get(key) || 0,
    });
  }
  return trend;
};

const buildWeeklyActivity = (completions, today, timezone) => {
  const todayKey = getDateKey(today, timezone);
  const startKey = getWeekStartKey(todayKey);
  const counts = new Map();

  for (const completion of completions) {
    const key = getCompletionDateKey(completion, timezone);
    if (key >= startKey && key <= todayKey) counts.set(key, (counts.get(key) || 0) + 1);
  }

  const days = [];
  for (let key = startKey; key <= todayKey; key = shiftDateKey(key, 1)) {
    const weekday = getWeekdayForDateKey(key);
    days.push({
      dateKey: key,
      day: dayLabels[weekday],
      label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
        .format(dateFromKey(key)),
      isToday: key === todayKey,
      value: counts.get(key) || 0,
    });
  }
  return { days, hasHistory: completions.length > 0 };
};

const buildInsights = (performance, trend, habits) => {
  const insights = [];
  const wellTracked = performance.filter((habit) => habit.scheduledDays >= 3 && habit.completionRate !== null);
  const strongest = [...wellTracked].sort((a, b) => b.completionRate - a.completionRate)[0];
  if (strongest && strongest.completionRate >= 80) {
    insights.push({
      type: 'strength',
      title: `${strongest.name} is a bright spot`,
      detail: `${strongest.completionRate}% completion across ${strongest.scheduledDays} scheduled days in this period.`,
    });
  }

  const needsAttention = [...wellTracked]
    .filter((habit) => habit.completionRate < 40)
    .sort((a, b) => a.completionRate - b.completionRate)[0];
  if (needsAttention) {
    insights.push({
      type: 'attention',
      title: `${needsAttention.name} may need a smaller step`,
      detail: `${needsAttention.completedDays} of ${needsAttention.scheduledDays} scheduled days were completed in this period.`,
    });
  }

  if (trend.length >= 7) {
    const weekdayTotals = new Map();
    for (const entry of trend) {
      if (!entry.day) continue;
      weekdayTotals.set(entry.day, (weekdayTotals.get(entry.day) || 0) + entry.value);
    }
    const strongestDay = [...weekdayTotals.entries()].sort((a, b) => b[1] - a[1])[0];
    if (strongestDay && strongestDay[1] > 0) {
      insights.push({
        type: 'pattern',
        title: `${strongestDay[0]} has your highest activity`,
        detail: `${strongestDay[1]} completion${strongestDay[1] === 1 ? '' : 's'} recorded on that weekday in the selected view.`,
      });
    }
  }

  if (!insights.length && habits.length) {
    insights.push({
      type: 'tracking',
      title: 'Keep tracking to uncover patterns',
      detail: 'Insights appear after a habit has at least three scheduled days of history.',
    });
  }
  return insights;
};

const buildDashboardSummary = (habits, completions, activities = [], userTimezone = 'UTC') => {
  const sorted = [...habits].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  const activeHabits = sorted.filter((habit) => habit.status === 'active' && !habit.archivedAt);
  const today = new Date();
  const completionMap = new Map();
  for (const entry of completions) {
    completionMap.set(`${String(entry.habitId)}:${entry.localDateKey}`, entry);
  }

  const allHabitMetrics = activeHabits.map((habit) => ({
    habit,
    metrics: getHabitPeriodMetrics(habit, completions, today, 'all'),
  }));
  const checklist = activeHabits
    .filter((habit) => {
      const key = getDateKey(today, habit.timezone || 'UTC');
      return isScheduledOnKey(habit, key);
    })
    .map((habit) => {
      const todayKey = getDateKey(today, habit.timezone || 'UTC');
      const habitMetrics = allHabitMetrics.find((item) => String(item.habit._id) === String(habit._id))?.metrics;
      return {
        id: habit._id,
        name: habit.name,
        completed: completionMap.has(`${String(habit._id)}:${todayKey}`),
        category: habit.category,
        color: habit.color,
        icon: habit.icon,
        currentStreak: habitMetrics.currentStreak,
      };
    });

  const weeklyActivity = buildWeeklyActivity(completions, today, userTimezone);
  const completedToday = checklist.filter((habit) => habit.completed).length;
  const completionRate = checklist.length ? Math.round((completedToday / checklist.length) * 100) : null;

  return {
    stats: {
      activeHabits: activeHabits.length,
      scheduledToday: checklist.length,
      completedToday,
      dailyCompletion: completionRate,
      currentStreak: Math.max(...allHabitMetrics.map((item) => item.metrics.currentStreak), 0),
      longestStreak: Math.max(...allHabitMetrics.map((item) => item.metrics.longestStreak), 0),
    },
    chartData: activeHabits.map((habit) => ({
      name: habit.name,
      completed: completions.filter((entry) => String(entry.habitId) === String(habit._id)).length,
    })),
    weeklyActivity,
    recentActivity: activities,
    checklist,
  };
};

router.get('/dashboard', async (req, res) => {
  const [habits, completions, activities, user] = await Promise.all([
    getHabitsByUser(req.user.id),
    getCompletionsForUser(req.user.id),
    getActivitiesByUser(req.user.id, 10),
    findUserById(req.user.id),
  ]);
  return res.json(buildDashboardSummary(habits, completions, activities, user?.timezone || 'UTC'));
});

router.get('/weekly-review', async (req, res) => {
  const [habits, completions, user] = await Promise.all([
    getHabitsByUser(req.user.id),
    getCompletionsForUser(req.user.id),
    findUserById(req.user.id),
  ]);
  const timezone = user?.timezone || 'UTC';
  const todayKey = getDateKey(new Date(), timezone);
  const selectedDateKey = req.query.date ? String(req.query.date) : todayKey;
  if (!validDateKey(selectedDateKey) || selectedDateKey > todayKey) {
    return res.status(400).json({ message: 'Choose a valid date that is not in the future.' });
  }

  const weekStartKey = getWeekStartKey(selectedDateKey);
  const weekEndKey = [shiftDateKey(weekStartKey, 6), todayKey].sort()[0];
  const activeHabits = habits.filter((habit) => habit.status === 'active' && !habit.archivedAt);
  const weekCompletions = completions.filter((completion) => {
    const habit = activeHabits.find((item) => String(item._id) === String(completion.habitId));
    if (!habit || !validDateKey(completion.localDateKey)) return false;
    return completion.localDateKey >= weekStartKey
      && completion.localDateKey <= weekEndKey
      && completion.localDateKey >= getHabitStartKey(habit);
  });
  const occurrenceKeys = new Set(
    weekCompletions.map((completion) => `${String(completion.habitId)}:${completion.localDateKey}`)
  );
  const completedOccurrences = occurrenceKeys.size;
  const scheduledOccurrenceKeys = new Set(
    weekCompletions
      .filter((completion) => {
        const habit = activeHabits.find((item) => String(item._id) === String(completion.habitId));
        return habit && isScheduledOnKey(habit, completion.localDateKey);
      })
      .map((completion) => `${String(completion.habitId)}:${completion.localDateKey}`)
  );
  const completedScheduledOccurrences = scheduledOccurrenceKeys.size;

  const habitMetrics = activeHabits.map((habit) => {
    const startKey = [weekStartKey, getHabitStartKey(habit)].sort().at(-1);
    let scheduledDays = 0;
    let completedDays = 0;
    for (let key = startKey; key <= weekEndKey; key = shiftDateKey(key, 1)) {
      if (!isScheduledOnKey(habit, key)) continue;
      scheduledDays += 1;
      if (scheduledOccurrenceKeys.has(`${String(habit._id)}:${key}`)) completedDays += 1;
    }
    return {
      name: habit.name,
      scheduledDays,
      completedDays,
      completionRate: scheduledDays ? Math.round((completedDays / scheduledDays) * 100) : null,
    };
  });
  const trackedHabits = habitMetrics.filter((habit) => habit.scheduledDays >= 3);
  const mostConsistent = [...trackedHabits]
    .filter((habit) => habit.completionRate !== null)
    .sort((a, b) => b.completionRate - a.completionRate || b.completedDays - a.completedDays)[0];
  const needsAttention = [...trackedHabits]
    .filter((habit) => habit.completionRate !== null && habit.completionRate < 50)
    .sort((a, b) => a.completionRate - b.completionRate)[0];
  const scheduledOccurrences = habitMetrics.reduce((sum, habit) => sum + habit.scheduledDays, 0);
  const review = {
    weekStartKey,
    weekEndKey,
    completedOccurrences,
    completedScheduledOccurrences,
    scheduledOccurrences,
    completionRate: scheduledOccurrences
      ? Math.round((completedScheduledOccurrences / scheduledOccurrences) * 100)
      : null,
    mostConsistentHabit: mostConsistent?.name || null,
    mostConsistentRate: mostConsistent?.completionRate ?? null,
    needsAttentionHabit: needsAttention?.name || null,
    hasEnoughHabitHistory: trackedHabits.length > 0,
  };
  const guidance = await generateWeeklyReviewGuidance(review);

  return res.json({
    ...review,
    activeHabits: activeHabits.length,
    guidance: guidance.text,
    guidanceSource: guidance.source,
  });
});

router.get('/export', async (req, res) => {
  const period = String(req.query.period || '7');
  if (!allowedPeriods.has(period)) {
    return res.status(400).json({ message: 'Period must be 7, 30, or all.' });
  }

  const [habits, completions, user] = await Promise.all([
    getHabitsByUser(req.user.id),
    getCompletionsForUser(req.user.id),
    findUserById(req.user.id),
  ]);
  const today = new Date();
  const timezone = user?.timezone || 'UTC';
  const todayKey = getDateKey(today, timezone);
  const activeHabits = habits.filter((habit) => habit.status === 'active' && !habit.archivedAt);
  const activeHabitIds = new Set(activeHabits.map((habit) => String(habit._id)));
  const earliestHabit = [...activeHabits].sort(
    (a, b) => new Date(a.startDate || a.createdAt || today) - new Date(b.startDate || b.createdAt || today)
  )[0];
  const periodStartKey = period === 'all'
    ? earliestHabit ? getDateKey(earliestHabit.startDate || earliestHabit.createdAt || today, timezone) : todayKey
    : shiftDateKey(todayKey, -(Number(period) - 1));
  const habitById = new Map(activeHabits.map((habit) => [String(habit._id), habit]));
  const rows = completions
    .filter((completion) => {
      const completionKey = completion.localDateKey;
      return activeHabitIds.has(String(completion.habitId))
        && validDateKey(completionKey)
        && completionKey >= periodStartKey
        && completionKey <= todayKey;
    })
    .map((completion) => {
      const habit = habitById.get(String(completion.habitId));
      return [habit.name, habit.category || 'Other', completion.localDateKey, 'Completed'];
    })
    .sort((a, b) => a[2].localeCompare(b[2]) || a[0].localeCompare(b[0]));
  const escapeCsv = (value) => {
    const text = String(value ?? '');
    const safeText = /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  };
  const csv = [
    ['Habit name', 'Category', 'Completion date', 'Status'].map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\r\n');
  const filename = `habitpulse-progress-${period === 'all' ? 'all' : `${period}-days`}.csv`;

  return res
    .status(200)
    .set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Export-Row-Count': String(rows.length),
    })
    .send(csv);
});

router.get('/summary', async (req, res) => {
  const period = String(req.query.period || '7');
  if (!allowedPeriods.has(period)) {
    return res.status(400).json({ message: 'Period must be 7, 30, or all.' });
  }

  const [habits, completions, activities, user] = await Promise.all([
    getHabitsByUser(req.user.id),
    getCompletionsForUser(req.user.id),
    getActivitiesByUser(req.user.id, 10),
    findUserById(req.user.id),
  ]);
  const today = new Date();
  const activeHabits = habits.filter((habit) => habit.status === 'active' && !habit.archivedAt);
  const activeHabitIds = new Set(activeHabits.map((habit) => String(habit._id)));
  const activeCompletions = completions.filter((completion) => activeHabitIds.has(String(completion.habitId)));
  const knownHabitIds = new Set(habits.map((habit) => String(habit._id)));
  const knownCompletions = completions.filter((completion) => knownHabitIds.has(String(completion.habitId)));
  const timezone = user?.timezone || 'UTC';
  const todayKey = getDateKey(today, timezone);
  const earliestHabit = [...activeHabits].sort(
    (a, b) => new Date(a.startDate || a.createdAt || today) - new Date(b.startDate || b.createdAt || today)
  )[0];
  const earliestHabitKey = earliestHabit
    ? getDateKey(earliestHabit.startDate || earliestHabit.createdAt || today, timezone)
    : todayKey;
  const periodStartKey = period === 'all' ? earliestHabitKey : shiftDateKey(todayKey, -(Number(period) - 1));
  const performance = activeHabits.map((habit) => {
    const metrics = getHabitPeriodMetrics(habit, activeCompletions, today, period);
    return {
      ...habit,
      ...metrics,
      completions: metrics.completedDays,
    };
  }).sort((a, b) => {
    const rateDifference = (b.completionRate ?? -1) - (a.completionRate ?? -1);
    return rateDifference || b.completions - a.completions;
  });
  const totalCompletions = performance.reduce((sum, habit) => sum + habit.completedDays, 0);
  const totalScheduledDays = performance.reduce((sum, habit) => sum + habit.scheduledDays, 0);
  const overallCompletionRate = totalScheduledDays
    ? Math.round((totalCompletions / totalScheduledDays) * 100)
    : null;
  const mostConsistent = performance.find((habit) => habit.scheduledDays >= 3);
  const longestStreak = Math.max(...performance.map((habit) => habit.longestStreak || 0), 0);
  const trend = buildCompletionTrend(activeCompletions, todayKey, timezone, period, periodStartKey);
  const periodActivities = activities.filter((activity) => {
    const key = getDateKey(activity.occurredAt, timezone);
    return key >= periodStartKey && key <= todayKey;
  });

  return res.json({
    period,
    periodStartKey,
    todayKey,
    habits,
    completions,
    activities: periodActivities,
    total: habits.length,
    activeHabits: activeHabits.length,
    stats: {
      totalCompletions,
      totalScheduledDays,
      completionRate: overallCompletionRate,
      mostConsistentHabit: mostConsistent?.name || null,
      mostConsistentRate: mostConsistent?.completionRate ?? null,
      longestStreak,
    },
    performance,
    trend,
    heatmap: buildCompletionHeatmap(knownCompletions, todayKey),
    achievements: buildAchievements(habits, knownCompletions, todayKey, timezone),
    habitMix: buildHabitMix(activeHabits),
    insights: buildInsights(performance, trend, activeHabits),
  });
});

export default router;
