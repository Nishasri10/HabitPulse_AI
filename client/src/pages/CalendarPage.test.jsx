import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import CalendarPage from './CalendarPage';
import { getDateKeyForTimezone } from '../utils/habitPresentation';

vi.mock('axios', () => ({
  default: { get: vi.fn() },
}));

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('navigates between month and year boundaries and shows saved completion details', async () => {
    const habits = [
      { _id: 'habit-1', name: 'Read a book', category: 'Learning', frequency: 'daily', status: 'active', startDate: '2026-01-01', icon: '📚' },
      { _id: 'habit-2', name: 'Take a walk', category: 'Fitness', frequency: 'daily', status: 'active', startDate: '2026-01-01', icon: '🚶' },
      { _id: 'habit-3', name: 'Journal', category: 'Mindfulness', frequency: 'daily', status: 'active', startDate: '2026-01-01', icon: '✍️' },
    ];
    const completionDate = new Date(2026, 11, 20, 12);
    const completionKey = getDateKeyForTimezone(completionDate, 'UTC');
    axios.get.mockResolvedValue({
      data: {
        habits,
        completionMap: {
          [`habit-1:${completionKey}`]: { localDateKey: completionKey },
          [`habit-2:${completionKey}`]: { localDateKey: completionKey },
        },
      },
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 25, 12));
    const { container } = render(<CalendarPage />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: 'December 2026' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next Month' }));
    expect(screen.getByRole('heading', { name: 'January 2027' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous Month' }));
    expect(screen.getByRole('heading', { name: 'December 2026' })).toBeInTheDocument();

    const dateButton = screen.getByRole('button', { name: /December 20, 2026, 2 of 3 currently scheduled habits completed/ });
    expect(dateButton.querySelector('.calendar-progress-ring').style.getPropertyValue('--completion-progress')).toBe('67%');
    fireEvent.click(dateButton);
    expect(screen.getByText('Read a book')).toBeInTheDocument();
    expect(screen.getByText('Take a walk')).toBeInTheDocument();
    expect(screen.getByText('Journal')).toBeInTheDocument();
    expect(screen.getByText('Scheduled, not completed')).toBeInTheDocument();
    expect(screen.getByText('Not completed')).toBeInTheDocument();
    const noActivityDate = screen.getByRole('button', { name: /December 21, 2026/ });
    expect(noActivityDate.querySelector('.calendar-progress-ring')).toBeNull();
    expect(container.querySelectorAll('.calendar-activity-dot')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /December 26, 2026/ }));
    expect(screen.getByText('Scheduled for this date')).toBeInTheDocument();
    expect(screen.getAllByText('Upcoming')).toHaveLength(3);
  });
});
