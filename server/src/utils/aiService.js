import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

export function getFallbackCoachAnswer(prompt = '', summary = {}) {
  const normalized = String(prompt || '').toLowerCase();
  const totalHabits = Number(summary.totalHabits) || 0;
  const longestStreak = Number(summary.longestStreak) || 0;

  if (normalized.includes('procrastin')) {
    return 'Start by shrinking the task to a 5-minute version. Pick the smallest action that counts as progress, then let momentum carry you forward instead of waiting to feel motivated.';
  }

  if (normalized.includes('miss') || normalized.includes('skip') || normalized.includes('break')) {
    return 'A missed day is just data, not failure. Return to your plan the next scheduled day, keep the habit tiny, and focus on consistency over perfection.';
  }

  if (normalized.includes('motivat')) {
    return 'Motivation rises after action, not before it. Remove friction, attach the habit to an existing routine, and celebrate the first 2 minutes to build momentum.';
  }

  if (normalized.includes('how many') || normalized.includes('start with') || normalized.includes('many habits')) {
    return 'Start with 1 to 3 habits that matter most. A small, realistic plan is easier to maintain than a long list that feels overwhelming.';
  }

  if (normalized.includes('morning routine') || normalized.includes('routine')) {
    return 'Build a morning routine around cues you already have, like brushing your teeth or making coffee. Add one easy habit first, then stack a second habit only after the first feels automatic.';
  }

  if (normalized.includes('track') || normalized.includes('progress')) {
    return 'Track the habit in a simple way: a daily checkmark, a completed date, or a short note. Consistent tracking creates visible evidence of progress and helps you stay honest without judging yourself.';
  }

  if (normalized.includes('bad habit') || normalized.includes('break a habit')) {
    return 'Replace the trigger rather than fighting the urge. Notice when the habit happens, design a healthier alternative, and reward the replacement action to make it easier to choose.';
  }

  if (normalized.includes('exam') || normalized.includes('busy') || normalized.includes('schedule')) {
    return 'During busy days, keep the habit minimum viable. Reduce the target, shorten the time, or choose a single essential action to protect consistency when life gets crowded.';
  }

  if (normalized.includes('little time') || normalized.includes('short on time')) {
    return 'When time is short, focus on the smallest version of the habit. A 2- to 5-minute win still counts and protects your streak better than a skipped session.';
  }

  if (normalized.includes('lose motivation') || normalized.includes('motivation')) {
    return 'Recover by lowering the barrier, not by quitting. Return to your easiest version, pick a specific time, and remind yourself that a restart is part of habit-building.';
  }

  if (normalized.includes('easier') || normalized.includes('make a habit')) {
    return 'Make it obvious, easy, and attractive. Put the cue where you already are, trim the effort, and pair the habit with something you already enjoy.';
  }

  if (normalized.includes('consist') || normalized.includes('build a habit') || normalized.includes('habit consistently')) {
    return 'Consistency comes from repeatability, not intensity. Pick a single cue, keep the habit tiny, and make it easy to do on your weakest days so it survives real life.';
  }

  const habitMessage = totalHabits > 0 ? `You currently have ${totalHabits} active habits and a best streak of ${longestStreak} days.` : 'You are building momentum, so the goal is to keep the habit small and realistic.';
  return `Keep your focus on progress over perfection. ${habitMessage} Choose one small win today and make it easy enough that you can do it even when your day is busy.`;
}

export async function generateCoachInsight({ user, summary, prompt }) {
  const base = summary || {};
  const formatted = `User: ${user?.name || 'Friend'}\nActive habits: ${base.totalHabits || 0}\nCompleted today: ${base.completedToday || 0}\nBest streak: ${base.longestStreak || 0}\nRecent habits: ${(base.recentHabits || []).slice(0, 4).map((habit) => habit.name).join(', ') || 'No recent activity'}\nPrompt: ${prompt || 'Give me a motivational habit update.'}`;

  const fallbackText = getFallbackCoachAnswer(prompt, base);

  if (!env.geminiApiKey) {
    return {
      source: 'rule-based',
      text: fallbackText,
      summary: formatted,
    };
  }

  try {
    const model = new GoogleGenerativeAI(env.geminiApiKey).getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `You are a motivational habit coach. Use the user's real habit stats only. Write a concise, actionable response with no medical claims.\n\n${formatted}` }] }],
    });
    const text = result?.response?.candidates?.[0]?.content?.parts?.map((part) => part.text).join(' ') || fallbackText;
    return { source: 'gemini', text, summary: formatted };
  } catch (error) {
    return {
      source: 'rule-based',
      text: fallbackText,
      summary: formatted,
      error: error.message,
    };
  }
}
