const emojiByCategory = {
  Health: '💧',
  Fitness: '🏋️',
  Learning: '📚',
  Productivity: '☀️',
  Mindfulness: '🧘',
  'Personal Growth': '🌱',
  Other: '✅',
};

const emojiByKeyword = [
  [/read|book/i, '📚'],
  [/water|hydrat/i, '💧'],
  [/exercise|workout|fitness/i, '🏋️'],
  [/meditat|mindful/i, '🧘'],
  [/study|exam/i, '🎓'],
  [/cod|program/i, '💻'],
  [/walk|steps/i, '🚶'],
  [/sleep|bed/i, '🌙'],
  [/journal|write/i, '✍️'],
  [/eat|meal|food/i, '🥗'],
  [/japan/i, '🇯🇵'],
  [/morning|routine/i, '☀️'],
  [/skin/i, '🧴'],
];

export function getHabitEmoji(habit = {}) {
  const icon = habit.icon;
  if (typeof icon === 'string' && /\p{Extended_Pictographic}/u.test(icon) && !['✨', '✦'].includes(icon)) {
    return icon;
  }
  const match = emojiByKeyword.find(([pattern]) => pattern.test(habit.name || ''));
  return match?.[1] || emojiByCategory[habit.category] || '✅';
}

export function getDateKeyForTimezone(date = new Date(), timezone = 'UTC') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}
