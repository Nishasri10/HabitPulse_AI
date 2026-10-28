import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import DashboardPage from './DashboardPage';

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Jordan Lee', timezone: 'UTC' } }),
}));

vi.mock('recharts', () => {
  const Chart = ({ children }) => <div>{children}</div>;
  const Element = () => null;
  return {
    ResponsiveContainer: Chart,
    BarChart: Chart,
    Bar: Chart,
    CartesianGrid: Element,
    Cell: Element,
    Tooltip: Element,
    XAxis: Element,
    YAxis: Element,
  };
});

const dashboardData = {
  stats: {
    activeHabits: 1,
    scheduledToday: 1,
    completedToday: 0,
    dailyCompletion: 0,
    currentStreak: 0,
    longestStreak: 2,
  },
  checklist: [{
    id: 'habit-1',
    name: 'Read',
    category: 'Learning',
    icon: '📚',
    completed: false,
    currentStreak: 0,
  }],
  recentActivity: [],
  weeklyActivity: {
    hasHistory: false,
    days: [],
  },
};

describe('DashboardPage', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.post.mockReset();
    axios.delete.mockReset();
    axios.get.mockResolvedValue({ data: dashboardData });
    axios.post.mockResolvedValue({ data: { completion: {} } });
  });

  it('greets the authenticated user and optimistically updates today progress', async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(await screen.findByRole('heading', { name: /Jordan!/ })).toBeInTheDocument();
    expect(screen.getByText('0 / 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark complete: Read' }));

    expect(await screen.findByText('1 / 1')).toBeInTheDocument();
    expect(axios.post).toHaveBeenCalledWith(
      '/habits/habit-1/complete',
      expect.objectContaining({ date: expect.any(String) })
    );
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/analytics/dashboard'));
  });
});
