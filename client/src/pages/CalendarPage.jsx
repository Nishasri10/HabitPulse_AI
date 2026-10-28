import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getDateKeyForTimezone, getHabitEmoji } from '../utils/habitPresentation';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMonthYear = (date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [habits, setHabits] = useState([]);
  const [completionMap, setCompletionMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get('/habits');
        setHabits(data.habits || []);
        setCompletionMap(data.completionMap || {});
      } catch (error) {
        console.error('Failed to load calendar data', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const monthDays = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const leadingBlanks = Array.from({ length: start.getDay() }, (_, index) => index);
    const daysInMonth = Array.from({ length: end.getDate() }, (_, index) => index + 1);
    return [...leadingBlanks.map(() => null), ...daysInMonth.map((day) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))];
  }, [currentMonth]);

  const selectedEntries = habits.filter((habit) => {
    const habitDateKey = getDateKeyForTimezone(selectedDate, habit.timezone || 'UTC');
    return completionMap[`${habit._id}:${habitDateKey}`];
  });
  const todayKey = getDateKey(new Date());

  const changeMonth = (direction) => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1);
    const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    const nextSelection = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(selectedDate.getDate(), lastDay));
    setCurrentMonth(nextMonth);
    setSelectedDate(nextSelection);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  return (
    <div className="page-shell">
      <div className="card p-4">
        <div className="calendar-toolbar mb-3">
          <div>
            <div className="eyebrow">Calendar</div>
            <h3 className="calendar-month-title mb-0">{formatMonthYear(currentMonth)}</h3>
          </div>
          <div className="calendar-nav">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => changeMonth(-1)}>Previous Month</button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={goToToday}>Today</button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => changeMonth(1)}>Next Month</button>
          </div>
        </div>

        {loading ? (
          <div className="text-muted">Loading calendar...</div>
        ) : (
          <>
            <div className="calendar-grid">
              {weekDays.map((label) => (
                <div key={label} className="calendar-head">{label}</div>
              ))}

              {monthDays.map((date, index) => {
                if (!date) {
                  return <div key={`blank-${index}`} className="calendar-cell empty" />;
                }

                const key = getDateKey(date);
                const entries = habits.filter((habit) => {
                  const habitDateKey = getDateKeyForTimezone(date, habit.timezone || 'UTC');
                  return completionMap[`${habit._id}:${habitDateKey}`];
                });
                const isToday = key === todayKey;
                const isSelected = key === getDateKey(selectedDate);

                return (
                  <button
                    key={key}
                    type="button"
                    className={`calendar-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                    aria-label={`${new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date)}${entries.length ? `, ${entries.length} completed habits` : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className="date-number">{date.getDate()}</div>
                    {entries.length > 0 ? (
                      <span className="completion-pill" title={entries.map((habit) => habit.name).join(', ')}>
                        {entries.slice(0, 3).map((habit) => getHabitEmoji(habit)).join(' ')}
                        {entries.length > 3 ? ` +${entries.length - 3}` : ''}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="calendar-detail-card mt-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">{new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(selectedDate)}</h5>
                <span className="calendar-badge">{selectedEntries.length} completion{selectedEntries.length === 1 ? '' : 's'}</span>
              </div>

              {selectedEntries.length > 0 ? (
                <div className="calendar-entry-list">
                  {selectedEntries.map((habit) => (
                    <div key={habit._id} className="calendar-entry-item">
                      <span className="calendar-entry-emoji" aria-hidden="true">{getHabitEmoji(habit)}</span>
                      <div>
                        <strong>{habit.name}</strong>
                        <div className="text-muted small">{habit.category || 'General'} • {habit.frequency}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  No habits were completed on this date yet. Mark one as complete to build your streak.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
