import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  timezone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export const habitSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().default(''),
  category: z.enum(['Health', 'Fitness', 'Learning', 'Productivity', 'Mindfulness', 'Personal Growth', 'Other']).optional(),
  frequency: z.enum(['daily', 'weekly']).optional().default('daily'),
  scheduledWeekdays: z.array(z.number().int().min(0).max(6)).optional().default([]),
  targetCount: z.number().int().min(1).max(10).optional().default(1),
  startDate: z.string().optional(),
  reminderTime: z.string().optional().default('09:00'),
  timezone: z.string().optional().default('UTC'),
  color: z.string().optional().default('#8B80C5'),
  icon: z.string().optional().default('✅'),
  status: z.enum(['active', 'paused']).optional().default('active'),
});

export function isValidObjectId(value) {
  return /^[0-9a-fA-F]{24}$/.test(value);
}
