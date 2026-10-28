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
    const habit = {
      _id: 'habit-1',
      name: 'Read a book',
      category: 'Learning',
      frequency: 'daily',
      timezone: 'UTC',
      icon: '📚',
      color: '#8B80C5',
    };
    const completionDate = new Date(2026, 11, 20);
    const completionKey = getDateKeyForTimezone(completionDate, 'UTC');
    axios.get.mockResolvedValue({
      data: {
        habits: [habit],
        completionMap: { [`${habit._id}:${completionKey}`]: { localDateKey: completionKey } },
      },
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 15, 12));
    render(<CalendarPage />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: 'December 2026' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next Month' }));
    expect(screen.getByRole('heading', { name: 'January 2027' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous Month' }));
    expect(screen.getByRole('heading', { name: 'December 2026' })).toBeInTheDocument();

    const dateButton = screen.getByRole('button', { name: /December 20, 2026, 1 completed habits/ });
    fireEvent.click(dateButton);
    expect(screen.getByText('Read a book')).toBeInTheDocument();
  });
});
