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
      .set('Cookie', cookieHeader);
    expect(analyticsWithHabit.body.habits.map((habit) => habit._id)).toContain(habitId);

    const completionResponse = await request(app)
      .post(`/api/habits/${habitId}/complete`)
      .set('Cookie', cookieHeader)
      .set('Idempotency-Key', `complete-${email}`)
      .send({ date: new Date().toISOString() });
    expect(completionResponse.status).toBe(201);

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
});
