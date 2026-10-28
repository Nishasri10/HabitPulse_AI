import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MotivationalPopup from './MotivationalPopup';

describe('MotivationalPopup', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a quote occasionally and lets the user dismiss it', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    render(<MotivationalPopup />);

    expect(await screen.findByRole('dialog', { name: 'A little encouragement' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep Going' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
