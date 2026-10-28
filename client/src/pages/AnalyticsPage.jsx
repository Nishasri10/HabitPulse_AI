import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Activity, Award, CheckCircle2, Download, Flame, Target, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getHabitEmoji } from '../utils/habitPresentation';

const COLORS = ['#8174BD', '#77A68C', '#739DC4', '#D7A66B', '#C77F85', '#7F9D9B', '#AB8EBB'];
const periodLabels = {
  7: 'Last 7 Days',
  30: 'Last 30 Days',
  'this-month': 'This Month',
  'last-month': 'Last Month',
  '3-months': 'Last 3 Months',
  'this-year': 'This Year',
  all: 'All Available History',
};

const tooltipStyle = {
  border: '1px solid var(--border)',
  borderRadius: 12,
  background: 'var(--card)',
  color: 'var(--text)',
  boxShadow: 'var(--shadow)',
};

const getWeekday = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('7');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError('');
      setData(null);
      try {
        const { data: summary } = await axios.get('/analytics/summary', {
          params: { period },
          signal: controller.signal,
        });
        setData(summary);
      } catch (requestError) {
        if (!axios.isCancel(requestError)) {
          setError(requestError.response?.data?.message || 'Unable to load analytics. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [period, reloadToken]);

  const mixData = useMemo(() => {
    const values = data?.habitMix || [];
    const total = values.reduce((sum, item) => sum + item.value, 0);
    return values.map((item) => ({
      ...item,
      percent: total ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [data?.habitMix]);

  const performance = data?.performance || [];
  const trend = data?.trend || [];
  const hasSelectedPeriodHistory = (data?.stats?.totalCompletions || 0) > 0;
  const completionRate = data?.stats?.completionRate;
  const heatmapWeeks = useMemo(() => {
    const days = data?.heatmap?.days || [];
    if (!days.length) return [];
    const padded = [...Array(getWeekday(days[0].dateKey)).fill(null), ...days];
    const weeks = [];
    for (let index = 0; index < padded.length; index += 7) weeks.push(padded.slice(index, index + 7));
    return weeks;
  }, [data?.heatmap?.days]);

  const exportCsv = async () => {
    setExporting(true);
    setExportMessage('');
    try {
      const response = await axios.get('/analytics/export', {
        params: { period },
        responseType: 'blob',
      });
      if (Number(response.headers['x-export-row-count']) === 0) {
        setExportMessage('There are no saved completions in this date range to export.');
        return;
      }

      const url = URL.createObjectURL(response.data);
      const download = document.createElement('a');
      download.href = url;
      download.download = `habitpulse-progress-${period}.csv`;
      document.body.append(download);
      download.click();
      download.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setExportMessage('Your progress CSV has been exported.');
    } catch (requestError) {
      setExportMessage(requestError.response?.data?.message || 'Unable to export progress right now.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-shell analytics-page">
      <header className="analytics-header">
        <div>
          <span className="eyebrow">Understand your consistency</span>
          <h2>Analytics &amp; Insights</h2>
          <p>Clear, practical views of your saved habit progress.</p>
        </div>
        <div className="analytics-controls">
          <label className="analytics-period-control">
            <span>Date range</span>
            <select
              className="form-select"
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value);
                setExportMessage('');
              }}
              aria-label="Analytics date range"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="3-months">Last 3 Months</option>
              <option value="this-year">This Year</option>
              <option value="all">All Available History</option>
            </select>
          </label>
          <button type="button" className="btn btn-outline-primary analytics-export-button" onClick={exportCsv} disabled={exporting || loading}>
            <Download size={16} aria-hidden="true" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </header>

      {exportMessage && <div className="analytics-export-message" role="status">{exportMessage}</div>}
      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center gap-3" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setReloadToken((token) => token + 1)}>
            Retry
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="analytics-skeleton-grid" role="status" aria-live="polite">
          {[0, 1, 2, 3].map((item) => <div key={item} className="dashboard-skeleton skeleton-stat" />)}
          <div className="dashboard-skeleton skeleton-panel" />
          <div className="dashboard-skeleton skeleton-panel" />
        </div>
      ) : data ? (
        <>
          <div className="analytics-period-summary">
            <span>{periodLabels[period]}</span>
            <span>
              {data.periodStartKey === data.periodEndKey
                ? `Tracking on ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${data.periodStartKey}T12:00:00`))}`
                : `Tracking ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${data.periodStartKey}T12:00:00`))} – ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${data.periodEndKey || data.todayKey}T12:00:00`))}`}
            </span>
          </div>

          <section className="analytics-extra-grid" aria-label="Consistency and achievements">
            <article className="analytics-panel analytics-heatmap-panel">
              <div className="analytics-panel-heading">
                <div>
                  <span className="eyebrow">Saved daily completions</span>
                  <h3>Consistency · last 52 weeks</h3>
                </div>
              </div>
              {data.heatmap?.hasHistory ? (
                <>
                  <div className="heatmap-scroll">
                    <div className="consistency-heatmap" role="grid" aria-label="Daily saved completion activity, last 52 weeks">
                      {heatmapWeeks.map((week, weekIndex) => (
                        <div className="heatmap-week" role="row" key={`week-${weekIndex}`}>
                          {week.map((day, dayIndex) => {
                            if (!day) return <span className="heatmap-empty-cell" key={`blank-${weekIndex}-${dayIndex}`} />;
                            const level = day.count === 0 ? 0 : day.count === 1 ? 1 : day.count <= 3 ? 2 : day.count <= 5 ? 3 : 4;
                            const activityText = day.count
                              ? `${day.count} saved completion${day.count === 1 ? '' : 's'}`
                              : 'No saved completions; this is not a confirmed missed day';
                            return (
                              <span
                                className="heatmap-day"
                                role="gridcell"
                                key={day.dateKey}
                                data-level={level}
                                title={`${day.dateKey}: ${activityText}`}
                                aria-label={`${day.dateKey}: ${activityText}`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="heatmap-legend" aria-label="Completion activity intensity">
                    <span>No records</span>
                    {[1, 2, 3, 4].map((level) => {
                      const intensityLabels = { 1: '1 completion', 2: '2 to 3 completions', 3: '4 to 5 completions', 4: '6 or more completions' };
                      return <i key={level} data-level={level} aria-label={intensityLabels[level]} />;
                    })}
                    <span>More completions</span>
                  </div>
                </>
              ) : (
                <div className="analytics-empty-state compact" role="status">
                  <strong>No saved completions in this 52-week view</strong>
                  <p>Untracked dates are left neutral; they are not treated as missed habits.</p>
                </div>
              )}
            </article>

            <article className="analytics-panel analytics-achievements-panel">
              <div className="analytics-panel-heading">
                <div>
                  <span className="eyebrow">Earned from saved records</span>
                  <h3>Achievements</h3>
                </div>
                <Award size={19} className="dashboard-heading-icon" aria-hidden="true" />
              </div>
              {data.achievements?.length ? (
                <div className="achievement-list">
                  {data.achievements.map((achievement) => (
                    <div className={`achievement-row ${achievement.unlocked ? 'unlocked' : 'locked'}`} key={achievement.id}>
                      <span className="achievement-icon" aria-hidden="true">{achievement.unlocked ? '✓' : '○'}</span>
                      <div className="achievement-copy">
                        <strong>{achievement.title}</strong>
                        <span>{achievement.description}</span>
                        {!achievement.unlocked && (
                          <span className="achievement-progress">
                            {achievement.progress} of {achievement.target} completions
                          </span>
                        )}
                      </div>
                      <span className="achievement-status">{achievement.unlocked ? 'Unlocked' : 'In progress'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="analytics-empty-state compact">
                  <strong>Start with one saved completion</strong>
                  <p>Milestones are calculated from your saved habit records.</p>
                </div>
              )}
            </article>
          </section>

          <section className="analytics-metrics-grid" aria-label="Selected period summary">
            <MetricCard
              title="Completions"
              value={data.stats.totalCompletions}
              detail={`Across ${data.activeHabits} active habit${data.activeHabits === 1 ? '' : 's'} · ${periodLabels[period].toLowerCase()}`}
              icon={<CheckCircle2 size={19} />}
              accent="sage"
            />
            <MetricCard
              title="Scheduled-day completion"
              value={completionRate === null ? '—' : `${completionRate}%`}
              detail={`${data.stats.totalScheduledCompletions || 0} completed of ${data.stats.totalScheduledDays} scheduled habit-days`}
              icon={<Target size={19} />}
              accent="lavender"
            />
            <MetricCard
              title="Most consistent"
              value={data.stats.mostConsistentHabit || '—'}
              detail={data.stats.mostConsistentHabit
                ? `${data.stats.mostConsistentRate}% of its scheduled days`
                : 'No scheduled habit-days in this range'}
              icon={<Activity size={19} />}
              accent="blue"
              compact
            />
            <MetricCard
              title="Best streak"
              value={`${data.stats.longestStreak} days`}
              detail="Longest recorded streak · all time"
              icon={<Flame size={19} />}
              accent="peach"
            />
          </section>

          <section className="analytics-chart-grid" aria-label="Habit analytics charts">
            <article className="analytics-panel analytics-trend-panel">
              <div className="analytics-panel-heading">
                <div>
                  <span className="eyebrow">Saved completion records</span>
                  <h3>Completion trend</h3>
                </div>
                <span className="analytics-period-chip">{periodLabels[period]}</span>
              </div>
              {hasSelectedPeriodHistory && trend.length ? (
                <div className="analytics-chart">
                  <ResponsiveContainer width="100%" height={285}>
                    <LineChart data={trend} margin={{ top: 12, right: 14, left: -18, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        minTickGap={22}
                        tick={{ fill: 'var(--secondary)', fontSize: 11 }}
                      />
                      <YAxis allowDecimals={false} width={38} tickLine={false} axisLine={false} tick={{ fill: 'var(--secondary)', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(_label, items) => items?.[0]?.payload?.dateKey || ''}
                        formatter={(value) => [`${value} completion${value === 1 ? '' : 's'}`, 'Saved activity']}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="Completions"
                        stroke="#8174BD"
                        strokeWidth={3}
                        dot={{ r: 3, fill: '#8174BD', strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="analytics-empty-state">
                  <span aria-hidden="true">📈</span>
                  <strong>No completions in this date range</strong>
                  <p>Your saved completion activity will appear here as you track habits.</p>
                </div>
              )}
            </article>

            <article className="analytics-panel analytics-mix-panel">
              <div className="analytics-panel-heading">
                <div>
                  <span className="eyebrow">Active routine distribution</span>
                  <h3>Habit mix</h3>
                </div>
              </div>
              {mixData.length ? (
                <>
                  <div className="analytics-donut-wrap">
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie
                          data={mixData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={58}
                          outerRadius={84}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {mixData.map((item, index) => (
                            <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value, name, item) => [`${value} habit${value === 1 ? '' : 's'} (${item.payload.percent}%)`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="analytics-donut-center" aria-hidden="true">
                      <strong>{data.activeHabits}</strong>
                      <span>active</span>
                    </div>
                  </div>
                  <ul className="analytics-mix-legend">
                    {mixData.map((item, index) => (
                      <li key={item.name}>
                        <span className="analytics-legend-swatch" style={{ background: COLORS[index % COLORS.length] }} />
                        <span className="analytics-legend-name">{item.name}</span>
                        <span className="analytics-legend-value">{item.value} · {item.percent}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="analytics-empty-state">
                  <span aria-hidden="true">🌱</span>
                  <strong>No active habits yet</strong>
                  <p>Create a habit to see your routine distribution.</p>
                  <Link to="/habits/new" className="dashboard-text-link">Add your first habit</Link>
                </div>
              )}
            </article>
          </section>

          <section className="analytics-panel analytics-monthly-panel" aria-label="Monthly consistency">
            <div className="analytics-panel-heading">
              <div>
                <span className="eyebrow">{periodLabels[period]}</span>
                <h3>Monthly consistency</h3>
              </div>
            </div>
            {data.monthlyConsistency?.length ? (
              <>
                <p className="analytics-monthly-caption">
                  Saved completions by calendar month. A zero bar means scheduled tracking with no saved completions; months without scheduled tracking are omitted.
                </p>
                <div className="analytics-chart analytics-monthly-chart">
                  <ResponsiveContainer width="100%" height={285}>
                    <BarChart data={data.monthlyConsistency} margin={{ top: 12, right: 14, left: -18, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} tick={{ fill: 'var(--secondary)', fontSize: 11 }} />
                      <YAxis allowDecimals={false} width={38} tickLine={false} axisLine={false} tick={{ fill: 'var(--secondary)', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(_label, items) => items?.[0]?.payload?.label || ''}
                        formatter={(value, _name, item) => [
                          `${value} saved completion${value === 1 ? '' : 's'}${item.payload.hasTrackingData
                            ? ` · ${item.payload.completionRate}% of ${item.payload.scheduledDays} scheduled habit-days`
                            : ' · no scheduled tracking days'}`,
                          'Monthly activity',
                        ]}
                      />
                      <Bar dataKey="completions" name="Saved completions" fill="#8174BD" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="analytics-empty-state compact" role="status">
                <strong>No monthly tracking data in this range</strong>
                <p>Monthly activity appears for months with saved completions or scheduled habit-days.</p>
              </div>
            )}
          </section>

          <section className="analytics-lower-grid" aria-label="Habit performance and insights">
            <article className="analytics-panel">
              <div className="analytics-panel-heading">
                <div>
                  <span className="eyebrow">Compared fairly by schedule</span>
                  <h3>Habit performance</h3>
                </div>
                <span className="analytics-sort-note">Sorted by scheduled-day completion rate</span>
              </div>
              {performance.length ? (
                <div className="habit-performance-list">
                  {performance.map((habit, index) => {
                    const emoji = getHabitEmoji(habit);
                    return (
                      <div className="habit-performance-row" key={habit._id}>
                        <span className="performance-rank">{index + 1}</span>
                        <span className="performance-emoji" aria-hidden="true">{emoji}</span>
                        <div className="performance-main">
                          <div className="performance-title-row">
                            <strong>{habit.name}</strong>
                            <span>{habit.completionRate === null ? 'N/A' : `${habit.completionRate}%`}</span>
                          </div>
                          <div
                            className="performance-track"
                            role="progressbar"
                            aria-label={`${habit.name} completion rate`}
                            aria-valuenow={habit.completionRate ?? 0}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <span style={{ width: `${habit.completionRate ?? 0}%` }} />
                          </div>
                          <small>
                            {habit.completionRate === null
                              ? 'No scheduled days in this range'
                              : `${habit.completedDays} of ${habit.scheduledDays} scheduled days · ${habit.completions} completion${habit.completions === 1 ? '' : 's'}`}
                          </small>
                        </div>
                        <span className="performance-streak" title="Current streak">
                          <Flame size={14} /> {habit.currentStreak}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="analytics-empty-state compact">
                  <strong>No active habits to compare</strong>
                  <p>Add or activate a habit to see scheduled-day performance.</p>
                </div>
              )}
            </article>

            <article className="analytics-panel">
              <div className="analytics-panel-heading">
                <div>
                  <span className="eyebrow">Based on your saved records</span>
                  <h3>Insights</h3>
                </div>
                <TrendingUp size={19} className="dashboard-heading-icon" aria-hidden="true" />
              </div>
              {data.insights?.length ? (
                <div className="analytics-insights-list">
                  {data.insights.map((insight) => (
                    <div className={`analytics-insight ${insight.type}`} key={`${insight.type}-${insight.title}`}>
                      <span aria-hidden="true">{insight.type === 'strength' ? '🌟' : insight.type === 'attention' ? '🌿' : '📊'}</span>
                      <div>
                        <strong>{insight.title}</strong>
                        <p>{insight.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="analytics-empty-state compact">
                  <strong>More tracking reveals more patterns</strong>
                  <p>Insights will appear when there is enough scheduled history to support them.</p>
                </div>
              )}
            </article>
          </section>
        </>
      ) : !loading && !error ? (
        <div className="analytics-empty-state" role="status">No analytics data is available yet.</div>
      ) : null}
    </div>
  );
}

function MetricCard({ title, value, detail, icon, accent, compact = false }) {
  return (
    <article className={`dashboard-stat-card ${accent} ${compact ? 'metric-compact' : ''}`}>
      <div className="dashboard-stat-icon">{icon}</div>
      <div className="dashboard-stat-copy">
        <span>{title}</span>
        <strong title={typeof value === 'string' ? value : undefined}>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}
