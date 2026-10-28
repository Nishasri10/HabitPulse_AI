import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { registerSchema, loginSchema } from '../utils/validation.js';
import { createUser, findUserByEmail, findUserById, updateUser } from '../data/store.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const profilePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  remindersEnabled: z.boolean().optional(),
}).strict();

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  timezone: z.string().trim().min(2).max(64).optional(),
  preferences: profilePreferencesSchema.optional(),
}).strict();

const signToken = (user) => jwt.sign({ id: user._id || user.id, email: user.email, name: user.name }, env.jwtSecret, { expiresIn: '7d' });

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  timezone: user.timezone || 'UTC',
  preferences: user.preferences || { theme: 'light', remindersEnabled: true },
});

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid registration details.', errors: parsed.error.flatten() });
    }
    const { name, email, password, timezone } = parsed.data;
    const exists = await findUserByEmail(email);
    if (exists) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      name,
      email,
      passwordHash,
      timezone: timezone || 'UTC',
      preferences: { theme: 'light', remindersEnabled: true },
    });
    const token = signToken(user);
    setAuthCookie(res, token);
    return res.status(201).json({ message: 'User created successfully', user: serializeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Registration failed.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid login request.' });
    }
    const { email, password } = parsed.data;
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid email or password.' });

    const token = signToken(user);
    setAuthCookie(res, token);
    return res.json({ message: 'Login successful', user: serializeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Login failed.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  return res.json({ user: serializeUser(user) });
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const parsed = profileSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid profile data.', errors: parsed.error.flatten() });
    }

    const { name, timezone, preferences } = parsed.data;
    const update = {};
    const currentUser = await findUserById(req.user.id);
    const currentPreferences = currentUser?.preferences || {};

    if (typeof name === 'string') update.name = name;
    if (typeof timezone === 'string') update.timezone = timezone;
    if (preferences) {
      update.preferences = { ...currentPreferences, ...preferences };
    }

    const user = await updateUser(req.user.id, update);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Profile update failed.' });
  }
});

router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Current and new passwords are required.' });
    }
    const user = await findUserById(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect.' });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await updateUser(req.user.id, { passwordHash });
    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Password change failed.' });
  }
});

export default router;
