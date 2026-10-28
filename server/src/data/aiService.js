import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

export async function generateCoachInsight({ user, summary, prompt }) {
  const base = summary || {};
  const formatted = `User: ${user?.name || 'Friend'}\nActive habits: ${base.totalHabits || 0}\nCompleted today: ${base.completedToday || 0}\nBest streak: ${base.longestStreak || 0}\nRecent habits: ${(base.recentHabits || []).slice(0, 4).map((habit) => habit.name).join(', ') || 'No recent activity'}\nPrompt: ${prompt || 'Give me a motivational habit update.'}`;

  if (!env.geminiApiKey) {
    return {
      source: 'rule-based',
      text: `I can help you focus on ${base.totalHabits || 0} active habits. Keep your momentum going by finishing at least one small win today. Your best habit streak is ${base.longestStreak || 0} days, so aim for a steady next step instead of a perfect day.`,
      summary: formatted,
    };
  }

  try {
    const model = new GoogleGenerativeAI(env.geminiApiKey).getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `You are a motivational habit coach. Use the user's real habit stats only. Write a concise, actionable response with no medical claims.\n\n${formatted}` }] }],
    });
    const text = result?.response?.candidates?.[0]?.content?.parts?.map((part) => part.text).join(' ') || 'No suggestion generated.';
    return { source: 'gemini', text, summary: formatted };
  } catch (error) {
    return {
      source: 'rule-based',
      text: `I could not reach the Gemini API right now, but your real progress is still important. Focus on your next scheduled habit, review misses, and keep your streak alive with one realistic step today.`,
      summary: formatted,
      error: error.message,
    };
  }
}
