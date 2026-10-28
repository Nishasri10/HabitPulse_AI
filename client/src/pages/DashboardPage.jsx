import { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, CheckCircle2, Flame, Target, BarChartHorizontalBig, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
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

export default function DashboardPage() {
  const [data, setData] = useState({ stats: {}, checklist: [], chartData: [], recentActivity: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const maxCompletions = Math.max(...(data.chartData || []).map((entry) => entry.completed || 0), 1);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get('/analytics/dashboard');
        setData(data);
      } catch (error) {
        setError(error.response?.data?.message || 'Unable to load your dashboard right now.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="page-shell">Loading dashboard...</div>;

  return (
    <div className="page-shell">
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="welcome-banner card">
            <div>
              <span className="eyebrow">Welcome back</span>
              <h2 className="mb-0">Small steps, lasting progress</h2>
            </div>
            <div className="small text-muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
          </div>
        </div>
        <div className="col-lg-4">
          <Link to="/habits/new" className="btn btn-primary w-100 h-100 rounded-4 d-flex align-items-center justify-content-center">+ Quick add habit</Link>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <StatCard title="Active habits" value={data.stats.activeHabits || 0} icon={<Activity size={20} />} accent="lavender" />
        <StatCard title="Completed today" value={data.stats.completedToday || 0} icon={<CheckCircle2 size={20} />} accent="sage" />
        <StatCard title="Daily completion" value={`${data.stats.dailyCompletion || 0}%`} icon={<Target size={20} />} accent="blue" />
        <StatCard title="Current streak" value={`${data.stats.currentStreak || 0} days`} icon={<Flame size={20} />} accent="orange" />
      </div>

      <div className="row g-4 mt-1">
        <div className="col-xl-7">
          <div className="card panel-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Completions by habit</h5>
              <BarChartHorizontalBig size={18} className="text-muted" />
            </div>
            <div className="chart-bars">
              {(data.chartData || []).map((entry) => (
                <div key={entry.name} className="chart-stack">
                  <div className="bar-label">{entry.name}</div>
                  <div className="bar-track"><div className="bar-fill" style={{ height: `${((entry.completed || 0) / maxCompletions) * 100}%` }} /></div>
                  <div className="bar-count">{entry.completed || 0}</div>
                </div>
              ))}
              {!data.chartData?.length && <div className="empty-state w-100">Add a habit and your completion progress will appear here.</div>}
            </div>
          </div>
        </div>
        <div className="col-xl-5">
          <div className="card panel-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Today's checklist</h5>
              <Sparkles size={18} className="text-muted" />
            </div>
            <div className="checklist-list">
              {(data.checklist || []).map((habit) => (
                <div key={habit.id} className="check-item">
                  <span className="check-item-emoji" aria-hidden="true">{getHabitEmoji(habit)}</span>
                  <span>{habit.name}</span>
                  <span className={`pill ${habit.completed ? 'done' : ''}`}>{habit.completed ? 'Done' : 'Pending'}</span>
                </div>
              ))}
              {!data.checklist?.length && (
                <div className="empty-state">
                  <div>No active habits yet. <Link to="/habits">Create your first habit</Link> to get started.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card panel-card mt-4">
        <h5 className="mb-3">Recent activity</h5>
        {(data.recentActivity || []).length > 0 ? (
          <div className="activity-timeline">
            {data.recentActivity.map((item) => (
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
          <div className="empty-state activity-empty">
            <div>
              <div className="empty-state-emoji" aria-hidden="true">🌱</div>
              <strong>Your journey starts here!</strong>
              <p className="mb-2">Create or complete your first habit to see your activity.</p>
              <Link to="/habits" className="btn btn-outline-primary btn-sm">Explore My Habits</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, accent }) {
  return (
    <div className="col-md-6 col-xl-3">
      <div className={`stat-card ${accent}`}>
        <div className="stat-icon">{icon}</div>
        <div>
          <div className="small text-muted">{title}</div>
          <div className="stat-value">{value}</div>
        </div>
      </div>
    </div>
  );
}
