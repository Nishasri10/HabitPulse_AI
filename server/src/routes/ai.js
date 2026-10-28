import express from 'express';
import { z } from 'zod';
import { generateCoachInsight } from '../utils/aiService.js';
import { getHabitsByUser, getCompletionsForUser } from '../data/store.js';

const router = express.Router();

const promptSchema = z.object({
  prompt: z.string().min(1).max(250),
  focus: z.string().max(60).optional(),
});

router.post('/coach', async (req, res) => {
  try {
    const parsed = promptSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Prompt must be between 1 and 250 characters.' });

    const habits = await getHabitsByUser(req.user.id);
    const completions = await getCompletionsForUser(req.user.id);

    const summary = {
      totalHabits: habits.filter((habit) => habit.status === 'active' && !habit.archivedAt).length,
      completedToday: completions.filter((c) => c.localDateKey === new Date().toISOString().slice(0, 10)).length,
      longestStreak: Math.max(...habits.map((habit) => (habit.frequency === 'daily' ? 3 : 2)), 0),
      recentHabits: habits.slice(0, 4),
    };

    const result = await generateCoachInsight({ user: req.user, summary, prompt: parsed.data.prompt });
    return res.json({ insight: result });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'AI coach request failed.' });
  }
});

export default router;
