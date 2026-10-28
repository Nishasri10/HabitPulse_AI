import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('axios', () => ({
  default: {
    defaults: {},
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

function ThemeProbe() {
  const { theme, setTheme } = useAuth();
  return (
    <div>
      <span>{theme}</span>
      <button type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        Change theme
      </button>
      <p>Current page</p>
    </div>
  );
}

describe('AuthProvider theme preference', () => {
  let accountUser;

  beforeEach(() => {
    accountUser = {
      id: 'user-1',
      name: 'Test User',
      preferences: { theme: 'dark', remindersEnabled: true },
    };
    window.localStorage.setItem('habitpulse-theme', 'dark');
    axios.get.mockImplementation(() => Promise.resolve({ data: { user: accountUser } }));
    axios.put.mockImplementation((_url, payload) => {
      accountUser = { ...accountUser, preferences: { ...accountUser.preferences, ...payload.preferences } };
      return Promise.resolve({ data: { user: accountUser } });
    });
  });

  afterEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.bsTheme;
    document.documentElement.style.removeProperty('color-scheme');
    vi.clearAllMocks();
  });

  it('applies the account theme at the document root and persists changes across provider remounts', async () => {
    const app = () => (
      <AuthProvider>
        <ThemeProbe />
      </AuthProvider>
    );
    const rendered = render(app());

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(document.documentElement.dataset.bsTheme).toBe('dark');
    });
    expect(screen.getByText('dark')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    });
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
    expect(window.localStorage.getItem('habitpulse-theme')).toBe('light');
    expect(axios.put).toHaveBeenCalledWith('/auth/profile', { preferences: { theme: 'light' } });
    expect(screen.getByText('Current page')).toBeInTheDocument();

    rendered.unmount();
    render(app());
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
    expect(screen.getByText('light')).toBeInTheDocument();
  });
});
