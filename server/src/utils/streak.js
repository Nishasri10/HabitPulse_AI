export function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function getDateKey(date, timezone = 'UTC') {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date(date));
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

export function toLocalDateKey(date, timezone = 'UTC') {
  return getDateKey(date, timezone);
}

export function getWeekday(date, timezone = 'UTC') {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });
  const weekday = formatter.format(new Date(date));
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? 0;
}

export function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function isHabitScheduledOnDate(habit, date, timezone = habit.timezone || 'UTC') {
  if (habit.frequency === 'daily') return true;
  const weekday = getWeekday(date, timezone);
  return (habit.scheduledWeekdays || []).includes(weekday);
}

export function computeCurrentStreak(habit, completionKeys, referenceDate = new Date(), timezone = habit.timezone || 'UTC') {
  const scheduledSet = new Set(completionKeys);
  const startDate = new Date(habit.startDate || new Date());
  let streak = 0;
  let cursor = new Date(referenceDate);

  while (true) {
    const key = getDateKey(cursor, timezone);
    const scheduled = isHabitScheduledOnDate(habit, cursor, timezone);

    if (!scheduled) {
      cursor = addDays(cursor, -1);
      continue;
    }

    if (cursor < startDate) break;

    if (scheduledSet.has(key)) {
      streak += 1;
      cursor = addDays(cursor, -1);
      continue;
    }

    break;
  }

  return streak;
}

export function computeLongestStreak(habit, completionKeys, timezone = habit.timezone || 'UTC') {
  const completionSet = new Set(completionKeys);
  const startDate = new Date(habit.startDate || new Date());
  const endDate = new Date();

  let longest = 0;
  let current = 0;

  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    if (!isHabitScheduledOnDate(habit, cursor, timezone)) continue;

    const key = getDateKey(cursor, timezone);
    if (completionSet.has(key)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

export function getCompletionRate(habit, completionKeys, referenceDate = new Date(), timezone = habit.timezone || 'UTC') {
  const completionSet = new Set(completionKeys);
  const startDate = new Date(habit.startDate || new Date());
  let total = 0;
  let done = 0;

  for (let cursor = new Date(startDate); cursor <= referenceDate; cursor = addDays(cursor, 1)) {
    if (!isHabitScheduledOnDate(habit, cursor, timezone)) continue;
    total += 1;
    if (completionSet.has(getDateKey(cursor, timezone))) done += 1;
  }

  if (!total) return 0;
  return Math.round((done / total) * 100);
}
