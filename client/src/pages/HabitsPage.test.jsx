import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import HabitsPage from './HabitsPage';

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

describe('HabitsPage suggested templates', () => {
  let habits;

  beforeEach(() => {
    habits = [];
    axios.get.mockImplementation((url) => {
      if (url === '/habits') return Promise.resolve({ data: { habits, completionMap: {} } });
      return Promise.resolve({ data: { checklist: [] } });
    });
    axios.post.mockImplementation((_url, habit) => {
      habits = [{ ...habit, _id: 'habit-1', status: 'active' }];
      return Promise.resolve({ data: { habit: habits[0] } });
    });
  });

  it('adds a suggested habit only after the user clicks Add Habit', async () => {
    render(
      <BrowserRouter>
        <HabitsPage />
      </BrowserRouter>
    );

    const addButtons = await screen.findAllByRole('button', { name: 'Add Habit' });
    expect(habits).toHaveLength(0);
    fireEvent.click(addButtons[0]);

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      '/habits',
      expect.objectContaining({ name: 'Read for 15 minutes', icon: '📚', status: 'active' }),
      expect.objectContaining({ headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }) })
    ));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Already added' })).toBeDisabled());
    expect(habits).toHaveLength(1);
  });
});
