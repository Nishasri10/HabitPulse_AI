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

const getHabitStartKey = (habit) => {
  if (typeof habit.startDate === 'string') {
    const match = habit.startDate.match(/^\d{4}-\d{2}-\d{2}/);
    return match?.[0] || '';
  }
  const date = new Date(habit.startDate);
  return Number.isNaN(date.getTime()) ? '' : getDateKey(date);
};

const getHabitDateKey = (date, habit) => {
  const localMidday = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  return getDateKeyForTimezone(localMidday, habit.timezone || 'UTC');
};

const getTodayKeyForHabit = (habit) => getDateKeyForTimezone(new Date(), habit.timezone || 'UTC');

const isScheduledOnDate = (habit, dateKey) => {
  const startKey = getHabitStartKey(habit);
  if (habit.status !== 'active' || habit.archivedAt || !startKey || dateKey < startKey) return false;
  if (habit.frequency === 'daily') return true;
  const weekday = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  return (habit.scheduledWeekdays || []).includes(weekday);
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [habits, setHabits] = useState([]);
  const [completionMap, setCompletionMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get('/habits');
        setHabits(data.habits || []);
        setCompletionMap(data.completionMap || {});
      } catch (requestError) {
        console.error('Failed to load calendar data', requestError);
        setError(requestError.response?.data?.message || 'Unable to load calendar activity. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [reloadToken]);

  const monthDays = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const leadingBlanks = Array.from({ length: start.getDay() }, (_, index) => index);
    const daysInMonth = Array.from({ length: end.getDate() }, (_, index) => index + 1);
    return [...leadingBlanks.map(() => null), ...daysInMonth.map((day) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))];
  }, [currentMonth]);

  const selectedEntries = habits.filter((habit) => {
    const key = getHabitDateKey(selectedDate, habit);
    return completionMap[`${habit._id}:${key}`];
  });
  const selectedScheduledHabits = habits.filter((habit) => isScheduledOnDate(habit, getHabitDateKey(selectedDate, habit)));
  const selectedIncompleteHabits = selectedScheduledHabits.filter(
    (habit) => {
      const dateKey = getHabitDateKey(selectedDate, habit);
      return dateKey <= getTodayKeyForHabit(habit) && !completionMap[`${habit._id}:${dateKey}`];
    }
  );
  const selectedUpcomingHabits = selectedScheduledHabits.filter(
    (habit) => {
      const dateKey = getHabitDateKey(selectedDate, habit);
      return dateKey > getTodayKeyForHabit(habit) && !completionMap[`${habit._id}:${dateKey}`];
    }
  );
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

        {error && (
          <div className="alert alert-danger d-flex justify-content-between align-items-center gap-3" role="alert">
            <span>{error}</span>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setReloadToken((token) => token + 1)}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-muted">Loading calendar...</div>
        ) : !error && (
          <>
            <div className="calendar-grid">
              {weekDays.map((label) => (
                <div key={label} className="calendar-head">{label}</div>
              ))}

              {monthDays.map((date, index) => {
                if (!date) return <div key={`blank-${index}`} className="calendar-cell empty" />;

                const key = getDateKey(date);
                const entries = habits.filter((habit) => completionMap[`${habit._id}:${getHabitDateKey(date, habit)}`]);
                const scheduledHabits = habits.filter((habit) => isScheduledOnDate(habit, getHabitDateKey(date, habit)));
                const completedScheduledCount = scheduledHabits.filter(
                  (habit) => completionMap[`${habit._id}:${getHabitDateKey(date, habit)}`]
                ).length;
                const progress = scheduledHabits.length
                  ? Math.round((completedScheduledCount / scheduledHabits.length) * 100)
                  : 0;
                const isToday = key === todayKey;
                const isSelected = key === getDateKey(selectedDate);
                const completionDescription = completedScheduledCount > 0
                  ? `${completedScheduledCount} of ${scheduledHabits.length} currently scheduled habits completed`
                  : entries.length
                    ? `${entries.length} saved completion${entries.length === 1 ? '' : 's'}`
                    : '';

                return (
                  <button
                    key={key}
                    type="button"
                    className={`calendar-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                    aria-label={`${new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date)}${completionDescription ? `, ${completionDescription}` : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className="date-number">{date.getDate()}</div>
                    {completedScheduledCount > 0 ? (
                      <span
                        className="calendar-progress-ring"
                        style={{ '--completion-progress': `${progress}%` }}
                        aria-hidden="true"
                        title={completionDescription}
                      />
                    ) : entries.length > 0 ? (
                      <span
                        className="calendar-activity-dot"
                        aria-hidden="true"
                        title={`${entries.length} saved completion${entries.length === 1 ? '' : 's'}`}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="calendar-legend" aria-label="Calendar legend">
              <span><i className="calendar-progress-ring legend-ring" aria-hidden="true" /> Completion progress</span>
              <span><i className="calendar-today-key" aria-hidden="true" /> Today</span>
              <span><i className="calendar-selected-key" aria-hidden="true" /> Selected date</span>
            </div>

            <div className="calendar-detail-card mt-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">{new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(selectedDate)}</h5>
                <span className="calendar-badge">{selectedEntries.length} completion{selectedEntries.length === 1 ? '' : 's'}</span>
              </div>

              {selectedEntries.length || selectedIncompleteHabits.length || selectedUpcomingHabits.length ? (
                <div className="calendar-entry-list">
                  {selectedEntries.length > 0 && (
                    <>
                      <h6 className="calendar-entry-heading">Completed</h6>
                      {selectedEntries.map((habit) => (
                        <div key={habit._id} className="calendar-entry-item completed">
                          <span className="calendar-entry-emoji" aria-hidden="true">{getHabitEmoji(habit)}</span>
                          <div className="calendar-entry-copy">
                            <strong>{habit.name}</strong>
                            <div className="text-muted small">{habit.category || 'General'} • {habit.frequency}</div>
                          </div>
                          <span className="calendar-entry-status">Completed</span>
                        </div>
                      ))}
                    </>
                  )}
                  {selectedIncompleteHabits.length > 0 && (
                    <>
                      <h6 className="calendar-entry-heading">Scheduled, not completed</h6>
                      {selectedIncompleteHabits.map((habit) => (
                        <div key={habit._id} className="calendar-entry-item incomplete">
                          <span className="calendar-entry-emoji" aria-hidden="true">{getHabitEmoji(habit)}</span>
                          <div className="calendar-entry-copy">
                            <strong>{habit.name}</strong>
                            <div className="text-muted small">{habit.category || 'General'} • {habit.frequency}</div>
                          </div>
                          <span className="calendar-entry-status">Not completed</span>
                        </div>
                      ))}
                    </>
                  )}
                  {selectedUpcomingHabits.length > 0 && (
                    <>
                      <h6 className="calendar-entry-heading">Scheduled for this date</h6>
                      {selectedUpcomingHabits.map((habit) => (
                        <div key={habit._id} className="calendar-entry-item upcoming">
                          <span className="calendar-entry-emoji" aria-hidden="true">{getHabitEmoji(habit)}</span>
                          <div className="calendar-entry-copy">
                            <strong>{habit.name}</strong>
                            <div className="text-muted small">{habit.category || 'General'} • {habit.frequency}</div>
                          </div>
                          <span className="calendar-entry-status">Upcoming</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="empty-state">No saved completion or scheduled habit activity for this date.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
