import { describe, expect, it } from 'vitest';
import { computeCurrentStreak, computeLongestStreak, getDateKey, isHabitScheduledOnDate } from '../src/utils/streak.js';

describe('habit streak logic', () => {
  it('does not break a weekly streak on unscheduled days', () => {
    const habit = {
      frequency: 'weekly',
      scheduledWeekdays: [1, 3],
      startDate: '2026-01-01T00:00:00.000Z',
      timezone: 'UTC',
    };

    const completionKeys = ['2026-01-05', '2026-01-07'];
    const streak = computeCurrentStreak(habit, completionKeys, new Date('2026-01-07T12:00:00Z'), 'UTC');
    expect(streak).toBe(2);
  });

  it('skips unscheduled days while continuing a weekly streak', () => {
    const habit = {
      frequency: 'weekly',
      scheduledWeekdays: [1, 3],
      startDate: '2026-01-01T00:00:00.000Z',
      timezone: 'UTC',
    };

    const completionKeys = ['2026-01-05', '2026-01-07', '2026-01-12'];
    const longest = computeLongestStreak(habit, completionKeys, 'UTC');
    expect(longest).toBe(3);
  });

  it('uses the habit timezone for scheduled date checks', () => {
    const habit = {
      frequency: 'weekly',
      scheduledWeekdays: [1],
      startDate: '2026-01-01T00:00:00.000Z',
      timezone: 'America/New_York',
    };

    const date = new Date('2026-01-05T10:00:00-05:00');
    expect(isHabitScheduledOnDate(habit, date, 'America/New_York')).toBe(true);
    expect(getDateKey(date, 'America/New_York')).toBe('2026-01-05');
  });
});
