import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import CoachPage from './CoachPage';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    isCancel: vi.fn(() => false),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { timezone: 'UTC' } }),
}));

describe('CoachPage weekly review', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it('loads a chosen week and clearly identifies local fallback guidance', async () => {
    axios.get.mockResolvedValue({
      data: {
        weekStartKey: '2026-10-25',
        weekEndKey: '2026-10-28',
        activeHabits: 1,
        completedOccurrences: 2,
        completedScheduledOccurrences: 2,
        scheduledOccurrences: 4,
        completionRate: 50,
        mostConsistentHabit: 'Read',
        mostConsistentRate: 50,
        needsAttentionHabit: null,
        guidance: 'Try a smaller version of the habit next week.',
        guidanceSource: 'rule-based',
      },
    });

    render(<CoachPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Review a week' }));

    expect(await screen.findByText('Suggestions for next week')).toBeInTheDocument();
    expect(screen.getByText('Local guidance')).toBeInTheDocument();
    expect(screen.getByText('2 of 4 scheduled habit-days')).toBeInTheDocument();
    expect(screen.getByText('Try a smaller version of the habit next week.')).toBeInTheDocument();
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith(
      '/analytics/weekly-review',
      expect.objectContaining({ params: { date: expect.any(String) } })
    ));
  });
});
