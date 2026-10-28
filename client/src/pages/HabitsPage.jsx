import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, PlayCircle, PauseCircle, CircleCheck, Check, ChevronDown } from 'lucide-react';
import suggestedHabits from '../data/suggestedHabits';
import { getDateKeyForTimezone, getHabitEmoji } from '../utils/habitPresentation';

const suggestionCategories = ['All', 'Health', 'Fitness', 'Learning', 'Productivity', 'Mindfulness'];

export default function HabitsPage() {
  const [habits, setHabits] = useState([]);
  const [completionMap, setCompletionMap] = useState({});
  const [streaks, setStreaks] = useState({});
  const [loading, setLoading] = useState(true);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [processingId, setProcessingId] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadHabits = async () => {
    try {
      const [habitsResponse, dashboardResponse] = await Promise.all([
        axios.get('/habits'),
        axios.get('/analytics/dashboard'),
      ]);
      setHabits(habitsResponse.data.habits || []);
      setCompletionMap(habitsResponse.data.completionMap || {});
      setStreaks(Object.fromEntries((dashboardResponse.data.checklist || []).map((habit) => [String(habit.id), habit.currentStreak || 0])));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to load your habits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHabits();
  }, []);

  const filteredSuggestions = useMemo(
    () => categoryFilter === 'All' ? suggestedHabits : suggestedHabits.filter((habit) => habit.category === categoryFilter),
    [categoryFilter]
  );

  const addSuggestedHabit = async (template) => {
    const duplicate = habits.some((habit) => habit.name.trim().toLowerCase() === template.name.toLowerCase());
    if (duplicate) {
      setMessage(`“${template.name}” is already in your habits.`);
      return;
    }

    setProcessingId(template.name);
    setMessage('');
    setErrorMessage('');
    try {
      await axios.post('/habits', {
        ...template,
        scheduledWeekdays: [],
        startDate: new Date().toISOString().slice(0, 10),
        reminderTime: '09:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        status: 'active',
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      setMessage(`Added “${template.name}”. You can edit its schedule and settings anytime.`);
      await loadHabits();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to add this suggested habit right now.');
    } finally {
      setProcessingId('');
    }
  };

  const toggleCompletion = async (habit) => {
    const dateKey = getDateKeyForTimezone(new Date(), habit.timezone || 'UTC');
    const key = `${habit._id}:${dateKey}`;
    const completed = Boolean(completionMap[key]);
    setProcessingId(String(habit._id));
    setMessage('');
    setErrorMessage('');

    try {
      if (completed) {
        await axios.delete(`/habits/${habit._id}/complete`, {
          data: { date: new Date().toISOString() },
          headers: { 'Idempotency-Key': crypto.randomUUID() },
        });
      } else {
        await axios.post(`/habits/${habit._id}/complete`, { date: new Date().toISOString() }, {
          headers: { 'Idempotency-Key': crypto.randomUUID() },
        });
      }
      await loadHabits();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to update this completion.');
    } finally {
      setProcessingId('');
    }
  };

  const toggleStatus = async (habit) => {
    setProcessingId(String(habit._id));
    try {
      await axios.patch(`/habits/${habit._id}/status`, { status: habit.status === 'active' ? 'paused' : 'active' }, {
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      });
      await loadHabits();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to update this habit.');
    } finally {
      setProcessingId('');
    }
  };

  const removeHabit = async (habit) => {
    if (!window.confirm(`Delete “${habit.name}” permanently?`)) return;
    setProcessingId(String(habit._id));
    try {
      await axios.delete(`/habits/${habit._id}`, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      await loadHabits();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to delete this habit.');
    } finally {
      setProcessingId('');
    }
  };

  if (loading) return <div className="page-shell">Loading habits...</div>;

  return (
    <div className="page-shell">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <span className="eyebrow">Your personal routines</span>
          <h2 className="mb-0">My Habits</h2>
        </div>
        <Link to="/habits/new" className="btn btn-primary rounded-pill"><Plus size={18} /> New habit</Link>
      </div>

      {message && <div className="alert alert-success" role="status">{message}</div>}
      {errorMessage && <div className="alert alert-danger" role="alert">{errorMessage}</div>}

      <section className="suggested-section card panel-card mb-4" aria-labelledby="suggested-title">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <span className="eyebrow">Optional templates</span>
            <h3 className="h5 mb-1" id="suggested-title">Suggested Habits</h3>
            <p className="text-muted mb-0 small">Choose a starter routine. It will only be added when you select Add Habit.</p>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            aria-expanded={suggestionsOpen}
            aria-controls="suggested-habits-list"
            onClick={() => setSuggestionsOpen((open) => !open)}
          >
            {suggestionsOpen ? 'Hide suggestions' : 'Browse suggestions'} <ChevronDown size={16} />
          </button>
        </div>

        {suggestionsOpen && (
          <div id="suggested-habits-list" className="mt-3">
            <div className="suggestion-filters mb-3" role="group" aria-label="Filter suggested habits by category">
              {suggestionCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`btn btn-sm ${categoryFilter === category ? 'btn-primary' : 'btn-outline-secondary'}`}
                  aria-pressed={categoryFilter === category}
                  onClick={() => setCategoryFilter(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="row g-3">
              {filteredSuggestions.map((template) => {
                const exists = habits.some((habit) => habit.name.trim().toLowerCase() === template.name.toLowerCase());
                return (
                  <div className="col-sm-6 col-xl-4" key={template.name}>
                    <article className="suggestion-card">
                      <div className="suggestion-emoji" aria-hidden="true">{template.icon}</div>
                      <div className="suggestion-content">
                        <h4>{template.name}</h4>
                        <p>{template.description}</p>
                        <div className="habit-meta mb-3">
                          <span>{template.category}</span>
                          <span>{template.frequency}</span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          disabled={exists || processingId === template.name}
                          onClick={() => addSuggestedHabit(template)}
                        >
                          {exists ? 'Already added' : processingId === template.name ? 'Adding...' : 'Add Habit'}
                        </button>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="my-habits-title">
        <h3 className="h5 mb-3" id="my-habits-title">Your habits</h3>
        {habits.length === 0 ? (
          <div className="empty-state habit-empty-state">
            <div>
              <div className="empty-state-emoji" aria-hidden="true">🌱</div>
              <h4>Your routines start here</h4>
              <p>Add a suggested habit or create one that fits your day.</p>
              <Link to="/habits/new" className="btn btn-primary rounded-pill">Create a habit</Link>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {habits.map((habit) => {
              const todayKey = getDateKeyForTimezone(new Date(), habit.timezone || 'UTC');
              const completedToday = Boolean(completionMap[`${habit._id}:${todayKey}`]);
              const habitEmoji = getHabitEmoji(habit);
              return (
                <div key={habit._id} className="col-md-6 col-xl-4">
                  <article className={`card habit-card ${completedToday ? 'completed' : ''}`} style={{ '--habit-accent': habit.color || '#8B80C5' }}>
                    <div className="habit-card-heading">
                      <div className="d-flex gap-3 align-items-center min-w-0">
                        <div className="habit-icon" aria-hidden="true">{habitEmoji}</div>
                        <div className="min-w-0">
                          <h4 className="habit-title mb-1">{habit.name}</h4>
                          <small className="text-muted">{habit.category || 'Other'}</small>
                        </div>
                      </div>
                      <span className={`status-pill ${habit.status === 'active' ? 'active' : 'paused'}`}>{habit.status}</span>
                    </div>

                    <p className="mt-3 text-muted mb-3 habit-description">{habit.description || 'No description provided.'}</p>
                    <div className="habit-meta">
                      <span>{habit.frequency}</span>
                      <span>{habit.targetCount || 1}x/day</span>
                      <span>{habit.scheduledWeekdays?.length ? 'Custom week' : 'Every day'}</span>
                      {habit.status === 'active' && <span>🔥 {streaks[String(habit._id)] || 0} day streak</span>}
                    </div>

                    <div className={`habit-today-status ${completedToday ? 'done' : ''}`}>
                      {completedToday ? <Check size={16} /> : <CircleCheck size={16} />}
                      {completedToday ? 'Completed today' : 'Not completed today'}
                    </div>

                    <div className="d-flex gap-2 mt-auto pt-3 flex-wrap">
                      {habit.status === 'active' && (
                        <button
                          type="button"
                          className={`btn btn-sm ${completedToday ? 'btn-outline-success' : 'btn-primary'}`}
                          onClick={() => toggleCompletion(habit)}
                          disabled={processingId === String(habit._id)}
                        >
                          {completedToday ? 'Undo completion' : 'Mark complete'}
                        </button>
                      )}
                      <Link to={`/habits/${habit._id}/edit`} className="btn btn-outline-primary btn-sm"><Pencil size={15} /> Edit</Link>
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => toggleStatus(habit)} disabled={processingId === String(habit._id)}>
                        {habit.status === 'active' ? <PauseCircle size={15} /> : <PlayCircle size={15} />} {habit.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeHabit(habit)} disabled={processingId === String(habit._id)} aria-label={`Delete ${habit.name}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
