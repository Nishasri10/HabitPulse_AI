import mongoose from 'mongoose';
import User from '../models/User.js';
import Habit from '../models/Habit.js';
import HabitCompletion from '../models/HabitCompletion.js';
import Activity from '../models/Activity.js';

export const memoryStore = {
  users: [],
  habits: [],
  completions: [],
  activities: [],
};

const createMemoryId = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const isDbReady = () => mongoose.connection.readyState === 1;

export async function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (isDbReady()) {
    return User.findOne({ email: normalized }).lean();
  }
  return memoryStore.users.find((user) => user.email === normalized) || null;
}

export async function findUserById(id) {
  if (isDbReady()) {
    return User.findById(id).lean();
  }
  return memoryStore.users.find((user) => String(user._id) === String(id)) || null;
}

export async function createUser(data) {
  if (isDbReady()) {
    return User.create(data);
  }

  const user = {
    _id: data._id || createMemoryId('user'),
    name: data.name,
    email: String(data.email || '').toLowerCase(),
    passwordHash: data.passwordHash,
    timezone: data.timezone || 'UTC',
    preferences: data.preferences || { theme: 'light', remindersEnabled: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  memoryStore.users.push(user);
  return user;
}

export async function updateUser(id, update) {
  if (isDbReady()) {
    return User.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  const index = memoryStore.users.findIndex((user) => String(user._id) === String(id));
  if (index === -1) return null;
  memoryStore.users[index] = { ...memoryStore.users[index], ...update, updatedAt: new Date().toISOString() };
  return memoryStore.users[index];
}

export async function getHabitsByUser(userId) {
  if (isDbReady()) {
    return Habit.find({ userId }).sort({ createdAt: -1 }).lean();
  }
  return memoryStore.habits.filter((habit) => String(habit.userId) === String(userId));
}

export async function getHabitById(id) {
  if (isDbReady()) {
    return Habit.findById(id).lean();
  }
  return memoryStore.habits.find((habit) => String(habit._id) === String(id)) || null;
}

export async function createHabit(data) {
  if (isDbReady()) {
    if (data.creationKey) {
      const existing = await Habit.findOne({
        userId: data.userId,
        creationKey: data.creationKey,
      }).lean();
      if (existing) return existing;
    }

    try {
      return await Habit.create(data);
    } catch (error) {
      if (error.code !== 11000 || !data.creationKey) throw error;
      const existing = await Habit.findOne({
        userId: data.userId,
        creationKey: data.creationKey,
      }).lean();
      if (!existing) throw error;
      return existing;
    }
  }

  if (data.creationKey) {
    const existing = memoryStore.habits.find(
      (habit) => String(habit.userId) === String(data.userId) && habit.creationKey === data.creationKey
    );
    if (existing) return existing;
  }

  const habit = {
    _id: data._id || createMemoryId('habit'),
    userId: data.userId,
    name: data.name,
    description: data.description || '',
    category: data.category || 'Other',
    frequency: data.frequency || 'daily',
    scheduledWeekdays: data.scheduledWeekdays || [],
    targetCount: data.targetCount || 1,
    startDate: data.startDate || new Date().toISOString(),
    reminderTime: data.reminderTime || '09:00',
    timezone: data.timezone || 'UTC',
    color: data.color || '#8B80C5',
    icon: data.icon || '✅',
    creationKey: data.creationKey,
    status: data.status || 'active',
    archivedAt: data.archivedAt || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  memoryStore.habits.push(habit);
  return habit;
}

export async function updateHabit(id, update) {
  if (isDbReady()) {
    return Habit.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  const index = memoryStore.habits.findIndex((habit) => String(habit._id) === String(id));
  if (index === -1) return null;
  memoryStore.habits[index] = { ...memoryStore.habits[index], ...update, updatedAt: new Date().toISOString() };
  return memoryStore.habits[index];
}

export async function deleteHabit(id) {
  if (isDbReady()) {
    await Habit.findByIdAndDelete(id);
    await HabitCompletion.deleteMany({ habitId: id });
    return true;
  }
  memoryStore.habits = memoryStore.habits.filter((habit) => String(habit._id) !== String(id));
  memoryStore.completions = memoryStore.completions.filter((completion) => String(completion.habitId) !== String(id));
  return true;
}

export async function getCompletionsForUser(userId) {
  if (isDbReady()) {
    return HabitCompletion.find({ userId }).sort({ completedAt: -1 }).lean();
  }
  return memoryStore.completions.filter((completion) => String(completion.userId) === String(userId));
}

export async function getCompletionsForHabit(habitId) {
  if (isDbReady()) {
    return HabitCompletion.find({ habitId }).sort({ completedAt: -1 }).lean();
  }
  return memoryStore.completions.filter((completion) => String(completion.habitId) === String(habitId));
}

export async function createCompletion(data) {
  if (isDbReady()) {
    return HabitCompletion.create(data);
  }

  const completion = {
    _id: data._id || createMemoryId('completion'),
    userId: data.userId,
    habitId: data.habitId,
    localDateKey: data.localDateKey,
    completedAt: data.completedAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  memoryStore.completions.push(completion);
  return completion;
}

export async function removeCompletion(habitId, localDateKey) {
  if (isDbReady()) {
    await HabitCompletion.deleteOne({ habitId, localDateKey });
    return true;
  }
  memoryStore.completions = memoryStore.completions.filter(
    (item) => !(String(item.habitId) === String(habitId) && item.localDateKey === localDateKey)
  );
  return true;
}

export async function findCompletion(habitId, localDateKey) {
  if (isDbReady()) {
    return HabitCompletion.findOne({ habitId, localDateKey }).lean();
  }
  return memoryStore.completions.find(
    (item) => String(item.habitId) === String(habitId) && item.localDateKey === localDateKey
  ) || null;
}

export async function createActivity(data) {
  if (isDbReady()) {
    if (data.idempotencyKey) {
      const existing = await Activity.findOne({
        userId: data.userId,
        idempotencyKey: data.idempotencyKey,
      }).lean();
      if (existing) return existing;
    }

    try {
      return await Activity.create(data);
    } catch (error) {
      if (error.code !== 11000 || !data.idempotencyKey) throw error;
      const existing = await Activity.findOne({
        userId: data.userId,
        idempotencyKey: data.idempotencyKey,
      }).lean();
      if (!existing) throw error;
      return existing;
    }
  }

  if (data.idempotencyKey) {
    const existing = memoryStore.activities.find(
      (activity) => String(activity.userId) === String(data.userId) && activity.idempotencyKey === data.idempotencyKey
    );
    if (existing) return existing;
  }

  const activity = {
    _id: createMemoryId('activity'),
    ...data,
    occurredAt: data.occurredAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  memoryStore.activities.push(activity);
  return activity;
}

export async function getActivitiesByUser(userId, limit = 10) {
  if (isDbReady()) {
    return Activity.find({ userId })
      .select('_id habitName habitCategory habitIcon type description occurredAt')
      .sort({ occurredAt: -1 })
      .limit(limit)
      .lean();
  }
  return memoryStore.activities
    .filter((activity) => String(activity.userId) === String(userId))
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
    .slice(0, limit)
    .map(({ _id, habitName, habitCategory, habitIcon, type, description, occurredAt }) => ({
      _id,
      habitName,
      habitCategory,
      habitIcon,
      type,
      description,
      occurredAt,
    }));
}
