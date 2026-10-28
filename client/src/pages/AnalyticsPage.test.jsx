import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import AnalyticsPage from './AnalyticsPage';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    isCancel: vi.fn(() => false),
  },
}));

vi.mock('recharts', () => {
  const Chart = ({ children }) => <div>{children}</div>;
  const Element = () => null;
  return {
    ResponsiveContainer: Chart,
    LineChart: Chart,
    Line: Element,
    XAxis: Element,
    YAxis: Element,
    CartesianGrid: Element,
    Tooltip: Element,
    PieChart: Chart,
    Pie: Chart,
    Cell: Element,
  };
});

const createSummary = (overrides = {}) => ({
  period: '7',
  periodStartKey: '2026-10-22',
  todayKey: '2026-10-28',
  activeHabits: 1,
  stats: {
    totalCompletions: 2,
    totalScheduledDays: 7,
    completionRate: 29,
    mostConsistentHabit: null,
    mostConsistentRate: null,
    longestStreak: 2,
  },
  habitMix: [{ name: 'Learning', value: 1 }],
  performance: [{
    _id: 'habit-1',
    name: 'Read',
    category: 'Learning',
    icon: '📚',
    completions: 2,
    completedDays: 2,
    scheduledDays: 7,
    completionRate: 29,
    currentStreak: 0,
  }],
  trend: [{ dateKey: '2026-10-28', label: 'Oct 28', day: 'Wed', isToday: true, value: 1 }],
  heatmap: {
    startKey: '2026-10-22',
    endKey: '2026-10-28',
    hasHistory: true,
    days: [
      { dateKey: '2026-10-22', count: 0 },
      { dateKey: '2026-10-23', count: 1 },
    ],
  },
  achievements: [{
    id: 'first-completion',
    title: 'First step',
    description: 'Save your first habit completion.',
    unlocked: true,
    progress: 1,
    target: 1,
  }],
  insights: [],
  ...overrides,
});

const renderPage = () => render(
  <BrowserRouter>
    <AnalyticsPage />
  </BrowserRouter>
);

describe('AnalyticsPage', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.isCancel.mockReturnValue(false);
  });

  it('shows real summary metrics and requests the selected date range', async () => {
    axios.get.mockResolvedValue({ data: createSummary() });
    renderPage();

    expect((await screen.findAllByText('29%')).length).toBeGreaterThan(0);
    expect(screen.getByText('2 completed of 7 scheduled habit-days')).toBeInTheDocument();
    expect(screen.getByText('Learning')).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: /daily saved completion activity/i })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: /2026-10-23: 1 saved completion/i })).toBeInTheDocument();
    expect(screen.getByText('First step')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Analytics date range' }), { target: { value: '30' } });
    await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith(
      '/analytics/summary',
      expect.objectContaining({ params: { period: '30' } })
    ));
  });

  it('shows helpful empty states without inventing habit or completion data', async () => {
    axios.get.mockResolvedValue({
      data: createSummary({
        activeHabits: 0,
        stats: {
          totalCompletions: 0,
          totalScheduledDays: 0,
          completionRate: null,
          mostConsistentHabit: null,
          mostConsistentRate: null,
          longestStreak: 0,
        },
        habitMix: [],
        performance: [],
        trend: [],
        heatmap: { hasHistory: false, days: [] },
        achievements: [],
        insights: [],
      }),
    });
    renderPage();

    expect(await screen.findByText('No completions in this date range')).toBeInTheDocument();
    expect(screen.getByText('No active habits yet')).toBeInTheDocument();
    expect(screen.getByText('No active habits to compare')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
