import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  BarChart3,
  Check,
  CheckCircle2,
  Flame,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHabitEmoji } from '../utils/habitPresentation';

const activityEmojis = {
  habit_created: '✨',
  habit_completed: '✅',
  habit_uncompleted: '↩️',
  habit_edited: '📝',
  habit_deleted: '🗑️',
  habit_status_changed: '🔄',
  daily_goal_achieved: '🎉',
  streak_milestone: '🔥',
};

const formatRelativeTime = (dateValue) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(dateValue).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(dateValue).toLocaleDateString();
};

const getGreeting = (user, timezone) => {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC',
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(new Date()));
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.trim().split(/\s+/)[0];
  return firstName ? `${timeGreeting}, ${firstName}!` : 'Welcome back!';
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState({
    stats: {},
    checklist: [],
    chartData: [],
    recentActivity: [],
    weeklyActivity: { days: [], hasHistory: false },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingHabitId, setUpdatingHabitId] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      const { data: dashboard } = await axios.get('/analytics/dashboard');
      setData({
        ...dashboard,
        stats: dashboard.stats || {},
        checklist: dashboard.checklist || [],
        chartData: dashboard.chartData || [],
        recentActivity: dashboard.recentActivity || [],
        weeklyActivity: dashboard.weeklyActivity || { days: [], hasHistory: false },
      });
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load your dashboard right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const toggleCompletion = async (habit) => {
    const wasCompleted = habit.completed;
    const scheduledToday = data.stats.scheduledToday || 0;
    const nextCompleted = wasCompleted ? Math.max(0, (data.stats.completedToday || 0) - 1) : (data.stats.completedToday || 0) + 1;
    setUpdatingHabitId(String(habit.id));
    setActionMessage('');
    setData((previous) => ({
      ...previous,
      checklist: previous.checklist.map((item) => item.id === habit.id ? { ...item, completed: !wasCompleted } : item),
      stats: {
        ...previous.stats,
        completedToday: nextCompleted,
        dailyCompletion: scheduledToday ? Math.round((nextCompleted / scheduledToday) * 100) : null,
      },
    }));

    try {
      const payload = { date: new Date().toISOString() };
      if (wasCompleted) {
        await axios.delete(`/habits/${habit.id}/complete`, { data: payload });
      } else {
        await axios.post(`/habits/${habit.id}/complete`, payload);
      }
      setActionMessage(wasCompleted ? `${habit.name} marked incomplete.` : `${habit.name} completed. Nice work!`);
      await loadDashboard();
    } catch (requestError) {
      await loadDashboard();
      setError(requestError.response?.data?.message || 'Unable to update this habit. Please try again.');
    } finally {
      setUpdatingHabitId('');
    }
  };

  if (loading) {
    return (
      <div className="page-shell dashboard-loading" role="status" aria-live="polite">
        <div className="dashboard-skeleton skeleton-wide" />
        <div className="dashboard-skeleton-grid">
          {[0, 1, 2, 3].map((item) => <div key={item} className="dashboard-skeleton skeleton-stat" />)}
        </div>
        <div className="dashboard-skeleton skeleton-panel" />
      </div>
    );
  }

  const timezone = user?.timezone || 'UTC';
  const progress = data.stats.dailyCompletion;
  const progressLabel = progress === null || progress === undefined ? '—' : `${progress}%`;
  const scheduledToday = data.stats.scheduledToday || 0;

  return (
    <div className="page-shell dashboard-page">
      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center gap-3" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadDashboard}>Retry</button>
        </div>
      )}
      {actionMessage && <div className="alert alert-success py-2" role="status">{actionMessage}</div>}

      <section className="dashboard-welcome" aria-labelledby="dashboard-greeting">
        <div>
          <span className="eyebrow">Your habit workspace</span>
          <h2 id="dashboard-greeting">{getGreeting(user, timezone)}</h2>
          <p>Small steps every day lead to meaningful progress.</p>
        </div>
        <div className="dashboard-welcome-actions">
          <time className="dashboard-date" dateTime={new Date().toISOString()}>
            {new Intl.DateTimeFormat(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              timeZone: timezone,
            }).format(new Date())}
          </time>
          <Link to="/habits/new" className="btn btn-primary rounded-pill px-4">+ Add a habit</Link>
        </div>
      </section>

      <section className="dashboard-stats-grid" aria-label="Habit summary">
        <StatCard title="Active habits" value={data.stats.activeHabits || 0} detail="Currently in your routine" icon={<Activity size={19} />} accent="lavender" />
        <StatCard
          title="Completed today"
          value={`${data.stats.completedToday || 0} / ${scheduledToday}`}
          detail={scheduledToday ? 'Of habits scheduled today' : 'Nothing scheduled today'}
          icon={<CheckCircle2 size={19} />}
          accent="sage"
        />
        <StatCard
          title="Today’s completion"
          value={progressLabel}
          detail={scheduledToday ? `${scheduledToday} scheduled habit${scheduledToday === 1 ? '' : 's'}` : 'No scheduled habits'}
          icon={<Target size={19} />}
          accent="blue"
        />
        <StatCard title="Best streak" value={`${data.stats.longestStreak || 0} days`} detail="Across your active habits" icon={<Flame size={19} />} accent="peach" />
      </section>

      <section className="dashboard-main-grid" aria-label="Today's habits and progress">
        <div className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <span className="eyebrow">Stay on track</span>
              <h3>Today’s habits</h3>
            </div>
            <Link to="/habits" className="dashboard-text-link">Manage habits</Link>
          </div>

          {data.checklist.length ? (
            <div className="today-habit-list">
              {data.checklist.map((habit) => (
                <div key={habit.id} className={`today-habit-row ${habit.completed ? 'is-completed' : ''}`}>
                  <span className="today-habit-emoji" aria-hidden="true">{getHabitEmoji(habit)}</span>
                  <div className="today-habit-info">
                    <strong>{habit.name}</strong>
                    <small>{habit.category || 'Habit'}{habit.currentStreak ? ` · ${habit.currentStreak} day streak` : ''}</small>
                  </div>
                  <button
                    type="button"
                    className={`habit-check-button ${habit.completed ? 'checked' : ''}`}
                    aria-label={`${habit.completed ? 'Mark incomplete' : 'Mark complete'}: ${habit.name}`}
                    aria-pressed={habit.completed}
                    disabled={updatingHabitId === String(habit.id)}
                    onClick={() => toggleCompletion(habit)}
                  >
                    {habit.completed && <Check size={17} />}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-state">
              <span aria-hidden="true">🌱</span>
              <strong>{data.stats.activeHabits ? 'No habits scheduled for today' : 'Your routine starts here'}</strong>
              <p>{data.stats.activeHabits ? 'Enjoy the breathing room, or review your weekly schedule.' : 'Create a habit to build a routine that works for you.'}</p>
              <Link to="/habits" className="dashboard-text-link">{data.stats.activeHabits ? 'View your habits' : 'Create your first habit'}</Link>
            </div>
          )}
        </div>

        <aside className="dashboard-progress-panel" aria-label="Today's completion progress">
          <div className="dashboard-section-heading">
            <div>
              <span className="eyebrow">One day at a time</span>
              <h3>Daily progress</h3>
            </div>
          </div>
          <div
            className={`progress-ring ${progress === null || progress === undefined ? 'no-progress' : ''}`}
            style={{ '--progress-degrees': `${progress || 0}%` }}
            role="progressbar"
            aria-valuenow={progress ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Today's completion progress"
          >
            <div className="progress-ring-inner">
              <strong>{progressLabel}</strong>
              <span>complete</span>
            </div>
          </div>
          <p className="progress-summary">
            {scheduledToday
              ? `${data.stats.completedToday || 0} of ${scheduledToday} scheduled habits completed`
              : 'No habits are scheduled for today.'}
          </p>
          <p className="progress-encouragement">
            {progress === 100 ? 'Wonderful consistency—everything scheduled is done.' : progress > 0 ? 'Every small action moves you forward.' : scheduledToday ? 'Choose one small win to get started.' : 'Your progress will appear here when a habit is scheduled.'}
          </p>
        </aside>
      </section>

      <section className="dashboard-lower-grid" aria-label="Activity and recent progress">
        <div className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <span className="eyebrow">This week</span>
              <h3>Weekly activity</h3>
            </div>
            <TrendingUp size={19} className="dashboard-heading-icon" aria-hidden="true" />
          </div>
          {data.weeklyActivity?.hasHistory ? (
            <div className="dashboard-week-chart">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={data.weeklyActivity.days} margin={{ top: 12, right: 4, left: -22, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'var(--secondary)', fontSize: 12 }} />
                  <YAxis allowDecimals={false} width={36} tickLine={false} axisLine={false} tick={{ fill: 'var(--secondary)', fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(139, 128, 197, 0.08)' }}
                    labelFormatter={(_label, items) => items?.[0]?.payload?.label || ''}
                    formatter={(value) => [`${value} completion${value === 1 ? '' : 's'}`, 'Activity']}
                  />
                  <Bar dataKey="value" name="Completions" radius={[7, 7, 0, 0]} maxBarSize={38}>
                    {data.weeklyActivity.days.map((day) => (
                      <Cell key={day.dateKey} fill={day.isToday ? 'var(--lavender)' : 'var(--chart-bar)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="chart-period-note">Daily saved completions · current day highlighted</div>
            </div>
          ) : (
            <div className="dashboard-empty-state chart-empty-state">
              <span aria-hidden="true">📈</span>
              <strong>Your activity will appear here</strong>
              <p>Complete a habit to start building your weekly history.</p>
            </div>
          )}
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <span className="eyebrow">Your recent steps</span>
              <h3>Recent activity</h3>
            </div>
            <BarChart3 size={19} className="dashboard-heading-icon" aria-hidden="true" />
          </div>
          {data.recentActivity.length > 0 ? (
            <div className="activity-timeline dashboard-activity-timeline">
              {data.recentActivity.slice(0, 6).map((item) => (
                <div key={item._id} className="activity-timeline-item">
                  <span className="activity-type-icon" aria-hidden="true">{activityEmojis[item.type] || '🌱'}</span>
                  <span className="activity-habit-emoji" aria-hidden="true">
                    {getHabitEmoji({ name: item.habitName, category: item.habitCategory, icon: item.habitIcon })}
                  </span>
                  <div className="activity-description">
                    <strong>{item.description}</strong>
                    <small className="text-muted">{formatRelativeTime(item.occurredAt)}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-state chart-empty-state">
              <span aria-hidden="true">🌱</span>
              <strong>Your journey starts here</strong>
              <p>Create or complete a habit to see real activity here.</p>
              <Link to="/habits" className="dashboard-text-link">Explore My Habits</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, detail, icon, accent }) {
  return (
    <article className={`dashboard-stat-card ${accent}`}>
      <div className="dashboard-stat-icon">{icon}</div>
      <div className="dashboard-stat-copy">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}
