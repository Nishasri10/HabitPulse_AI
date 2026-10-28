import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';

describe('HabitPulseAI API', () => {
  it('returns health check status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('registers a user with valid payload', async () => {
    const email = `jane${Date.now()}@example.com`;
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jane Doe', email, password: 'secret123', timezone: 'UTC' });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(email);
  });

  it('updates profile preferences for an authenticated user', async () => {
    const email = `profile${Date.now()}@example.com`;
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Profile User', email, password: 'secret123', timezone: 'UTC' });

    const cookieHeader = registerResponse.headers['set-cookie'];
    const response = await request(app)
      .put('/api/auth/profile')
      .set('Cookie', cookieHeader)
      .send({
        timezone: 'Europe/London',
        preferences: {
          theme: 'dark',
          remindersEnabled: false,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.user.timezone).toBe('Europe/London');
    expect(response.body.user.preferences.theme).toBe('dark');
    expect(response.body.user.preferences.remindersEnabled).toBe(false);
  });

  it('persists user activity and keeps history after a habit is deleted', async () => {
    const email = `activity${Date.now()}@example.com`;
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Activity User', email, password: 'secret123', timezone: 'UTC' });
    const cookieHeader = registerResponse.headers['set-cookie'];

    const habitResponse = await request(app)
      .post('/api/habits')
      .set('Cookie', cookieHeader)
      .set('Idempotency-Key', `create-${email}`)
      .send({
        name: 'Read a book',
        category: 'Learning',
        frequency: 'daily',
        startDate: new Date().toISOString().slice(0, 10),
        icon: '📚',
      });

    expect(habitResponse.status).toBe(201);
    const habitId = habitResponse.body.habit._id;

    const retryResponse = await request(app)
      .post('/api/habits')
      .set('Cookie', cookieHeader)
      .set('Idempotency-Key', `create-${email}`)
      .send({
        name: 'Read a book',
        category: 'Learning',
        frequency: 'daily',
        startDate: new Date().toISOString().slice(0, 10),
        icon: '📚',
      });
    expect(retryResponse.status).toBe(201);
    expect(retryResponse.body.habit._id).toBe(habitId);

    const analyticsWithHabit = await request(app)
      .get('/api/analytics/summary')
      .query({ period: '7' })
      .set('Cookie', cookieHeader);
    expect(analyticsWithHabit.body.habits.map((habit) => habit._id)).toContain(habitId);
    expect(analyticsWithHabit.body.stats.totalCompletions).toBe(0);
    expect(analyticsWithHabit.body.stats.totalScheduledDays).toBe(1);
    expect(analyticsWithHabit.body.stats.completionRate).toBe(0);

    const completionResponse = await request(app)
      .post(`/api/habits/${habitId}/complete`)
      .set('Cookie', cookieHeader)
      .set('Idempotency-Key', `complete-${email}`)
      .send({ date: new Date().toISOString() });
    expect(completionResponse.status).toBe(201);
    const analyticsWithCompletion = await request(app)
      .get('/api/analytics/summary')
      .query({ period: '7' })
      .set('Cookie', cookieHeader);
    expect(analyticsWithCompletion.body.stats.totalCompletions).toBe(1);
    expect(analyticsWithCompletion.body.stats.completionRate).toBe(100);
    expect(analyticsWithCompletion.body.performance[0].completedDays).toBe(1);

    const dashboardWithCompletion = await request(app)
      .get('/api/analytics/dashboard')
      .set('Cookie', cookieHeader);
    expect(dashboardWithCompletion.body.stats.scheduledToday).toBe(1);
    expect(dashboardWithCompletion.body.stats.dailyCompletion).toBe(100);
    expect(dashboardWithCompletion.body.weeklyActivity.hasHistory).toBe(true);
    expect(dashboardWithCompletion.body.weeklyActivity.days.reduce((sum, day) => sum + day.value, 0)).toBe(1);

    const deleteResponse = await request(app)
      .delete(`/api/habits/${habitId}`)
      .set('Cookie', cookieHeader)
      .set('Idempotency-Key', `delete-${email}`);
    expect(deleteResponse.status).toBe(200);

    const analyticsAfterDelete = await request(app)
      .get('/api/analytics/summary')
      .set('Cookie', cookieHeader);
    expect(analyticsAfterDelete.body.habits.map((habit) => habit._id)).not.toContain(habitId);

    const dashboardResponse = await request(app)
      .get('/api/analytics/dashboard')
      .set('Cookie', cookieHeader);
    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.recentActivity.map((activity) => activity.type)).toEqual(
      expect.arrayContaining(['habit_created', 'habit_completed', 'habit_deleted'])
    );
    expect(dashboardResponse.body.recentActivity.filter((activity) => activity.type === 'habit_created')).toHaveLength(1);
    expect(dashboardResponse.body.recentActivity.find((activity) => activity.type === 'habit_deleted').habitName).toBe('Read a book');
  });

  it('rejects unsupported analytics periods', async () => {
    const email = `period${Date.now()}@example.com`;
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Period User', email, password: 'secret123', timezone: 'UTC' });

    const response = await request(app)
      .get('/api/analytics/summary')
      .query({ period: '365' })
      .set('Cookie', registerResponse.headers['set-cookie']);

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Period must be/);
  });

  it('supports 7-day, 30-day, and all-history analytics ranges', async () => {
    const email = `ranges${Date.now()}@example.com`;
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Range User', email, password: 'secret123', timezone: 'UTC' });

    for (const period of ['7', '30', 'all']) {
      const response = await request(app)
        .get('/api/analytics/summary')
        .query({ period })
        .set('Cookie', registerResponse.headers['set-cookie']);
      expect(response.status).toBe(200);
      expect(response.body.period).toBe(period);
      expect(response.body.stats.completionRate).toBeNull();
      expect(response.body.trend.length).toBe(period === '7' ? 7 : period === '30' ? 30 : 0);
      expect(response.body.trend.every((day) => day.value === 0)).toBe(true);
    }
  });

  it('returns real heatmap and achievement data, a scheduled weekly review, and a scoped CSV export', async () => {
    const email = `polish${Date.now()}@example.com`;
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Polish User', email, password: 'secret123', timezone: 'UTC' });
    const cookieHeader = registerResponse.headers['set-cookie'];
    const todayKey = new Date().toISOString().slice(0, 10);
    const today = new Date(`${todayKey}T12:00:00.000Z`);
    const weekStartDate = new Date(today);
    weekStartDate.setUTCDate(weekStartDate.getUTCDate() - weekStartDate.getUTCDay());
    const weekStartKey = weekStartDate.toISOString().slice(0, 10);

    const habitResponse = await request(app)
      .post('/api/habits')
      .set('Cookie', cookieHeader)
      .send({
        name: 'Read "more", daily',
        category: 'Learning',
        frequency: 'daily',
        startDate: weekStartKey,
      });
    expect(habitResponse.status).toBe(201);
    const habitId = habitResponse.body.habit._id;

    const scheduledDays = today.getUTCDay() + 1;
    for (let day = 0; day < scheduledDays; day += 1) {
      const completionDate = new Date(weekStartDate);
      completionDate.setUTCDate(completionDate.getUTCDate() + day);
      const completionResponse = await request(app)
        .post(`/api/habits/${habitId}/complete`)
        .set('Cookie', cookieHeader)
        .send({ date: `${completionDate.toISOString().slice(0, 10)}T12:00:00.000Z` });
      expect(completionResponse.status).toBe(201);
    }

    const summaryResponse = await request(app)
      .get('/api/analytics/summary')
      .set('Cookie', cookieHeader);
    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body.heatmap.hasHistory).toBe(true);
    expect(summaryResponse.body.heatmap.days.find((day) => day.dateKey === todayKey).count).toBe(1);
    expect(summaryResponse.body.achievements.find((item) => item.id === 'first-completion').unlocked).toBe(true);
    expect(summaryResponse.body.achievements.find((item) => item.id === 'seven-completions').unlocked).toBe(false);
    expect(new Set(summaryResponse.body.achievements.map((item) => item.id)).size).toBe(3);

    const weeklyResponse = await request(app)
      .get('/api/analytics/weekly-review')
      .query({ date: todayKey })
      .set('Cookie', cookieHeader);
    expect(weeklyResponse.status).toBe(200);
    expect(weeklyResponse.body.weekStartKey).toBe(weekStartKey);
    expect(weeklyResponse.body.completedOccurrences).toBe(scheduledDays);
    expect(weeklyResponse.body.completedScheduledOccurrences).toBe(scheduledDays);
    expect(weeklyResponse.body.scheduledOccurrences).toBe(scheduledDays);
    expect(weeklyResponse.body.completionRate).toBe(100);
    expect(weeklyResponse.body.mostConsistentHabit).toBe(
      scheduledDays >= 3 ? 'Read "more", daily' : null
    );
    expect(['gemini', 'rule-based']).toContain(weeklyResponse.body.guidanceSource);

    const invalidWeekResponse = await request(app)
      .get('/api/analytics/weekly-review')
      .query({ date: '2026-02-31' })
      .set('Cookie', cookieHeader);
    expect(invalidWeekResponse.status).toBe(400);

    const exportResponse = await request(app)
      .get('/api/analytics/export')
      .query({ period: '7' })
      .set('Cookie', cookieHeader);
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers['x-export-row-count']).toBe(String(scheduledDays));
    expect(exportResponse.headers['content-type']).toMatch(/text\/csv/);
    expect(exportResponse.text).toContain('"Read ""more"", daily","Learning"');
  });
});
