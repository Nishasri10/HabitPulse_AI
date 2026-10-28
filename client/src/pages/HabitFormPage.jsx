import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { getHabitEmoji } from '../utils/habitPresentation';

const categories = ['Health', 'Fitness', 'Learning', 'Productivity', 'Mindfulness', 'Personal Growth', 'Other'];
const colorOptions = ['#8B80C5', '#78A8D8', '#83A988', '#DB8C70', '#D1A84E', '#6F83B7', '#C77D9B', '#6E9D92'];
const emojiOptions = ['📚', '💧', '🏋️', '🧘', '🎓', '💻', '🚶', '🌙', '✍️', '🥗', '🇯🇵', '☀️', '🧴', '🌱', '✅'];
const categoryEmojis = {
  Health: '💧',
  Fitness: '🏋️',
  Learning: '📚',
  Productivity: '☀️',
  Mindfulness: '🧘',
  'Personal Growth': '🌱',
  Other: '✅',
};

export default function HabitFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Health',
    frequency: 'daily',
    scheduledWeekdays: [],
    targetCount: 1,
    startDate: new Date().toISOString().slice(0, 10),
    reminderTime: '09:00',
    timezone: 'UTC',
    color: '#8B80C5',
    icon: '💧',
    status: 'active',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const { data } = await axios.get(`/habits/${id}`);
        setForm({
          ...data.habit,
          icon: getHabitEmoji(data.habit),
          startDate: data.habit.startDate ? new Date(data.habit.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        });
      } catch (error) {
        setErrorMessage(error.response?.data?.message || 'Unable to load this habit.');
      }
    };
    load();
  }, [id]);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleWeekday = (day) => {
    setForm((prev) => {
      const exists = prev.scheduledWeekdays.includes(day);
      return {
        ...prev,
        scheduledWeekdays: exists ? prev.scheduledWeekdays.filter((item) => item !== day) : [...prev.scheduledWeekdays, day],
      };
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    try {
      if (id) {
        await axios.put(`/habits/${id}`, form, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      } else {
        await axios.post('/habits', form, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      }
      navigate('/habits');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to save this habit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="card p-4">
        <h2 className="mb-4">{id ? 'Edit habit' : 'Add new habit'}</h2>
        <form onSubmit={submit} className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Habit name</label>
            <input className="form-control" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
          </div>
          <div className="col-md-6">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={form.category}
              onChange={(e) => setForm((prev) => ({
                ...prev,
                category: e.target.value,
                icon: categoryEmojis[e.target.value] || '✅',
              }))}
            >
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div className="col-12">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows="3" value={form.description} onChange={(e) => updateField('description', e.target.value)} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Frequency</label>
            <select className="form-select" value={form.frequency} onChange={(e) => updateField('frequency', e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Target count</label>
            <input type="number" min="1" max="10" className="form-control" value={form.targetCount} onChange={(e) => updateField('targetCount', Number(e.target.value))} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Start date</label>
            <input type="date" className="form-control" value={form.startDate} onChange={(e) => updateField('startDate', e.target.value)} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Reminder time</label>
            <input type="time" className="form-control" value={form.reminderTime} onChange={(e) => updateField('reminderTime', e.target.value)} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Timezone</label>
            <select className="form-select" value={form.timezone} onChange={(e) => updateField('timezone', e.target.value)}>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Kolkata">Asia/Kolkata</option>
            </select>
          </div>
          <div className="col-12">
            <label className="form-label">Accent color</label>
            <div className="color-picker" role="group" aria-label="Choose a habit color">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch ${form.color.toLowerCase() === color.toLowerCase() ? 'selected' : ''}`}
                  style={{ '--swatch-color': color }}
                  aria-label={`Choose habit color ${color}`}
                  aria-pressed={form.color.toLowerCase() === color.toLowerCase()}
                  onClick={() => updateField('color', color)}
                >
                  {form.color.toLowerCase() === color.toLowerCase() && <span aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="col-12">
            <label className="form-label">Habit emoji</label>
            <div className="emoji-picker" role="group" aria-label="Choose an emoji for this habit">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`emoji-option ${form.icon === emoji ? 'selected' : ''}`}
                  aria-label={`Choose ${emoji} as habit emoji`}
                  aria-pressed={form.icon === emoji}
                  onClick={() => updateField('icon', emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="col-12">
            <label className="form-label">Scheduled weekdays</label>
            <div className="weekday-picker d-flex flex-wrap gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, index) => (
                <button type="button" key={label} className={`weekday ${form.scheduledWeekdays.includes(index) ? 'selected' : ''}`} onClick={() => toggleWeekday(index)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="col-12 text-end">
            {errorMessage && <div className="alert alert-danger text-start" role="alert">{errorMessage}</div>}
            <button type="button" className="btn btn-outline-secondary me-2" onClick={() => navigate('/habits')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save habit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
