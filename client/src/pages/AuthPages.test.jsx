import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../components/MotivationalPopup', () => ({ default: () => null }));

const renderAuthPage = (page) => render(
  <MemoryRouter initialEntries={[{ pathname: `/${page}`, key: 'initial' }]}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<Layout><div>Dashboard content</div></Layout>} />
    </Routes>
  </MemoryRouter>
);

describe('authentication feedback', () => {
  const login = vi.fn();
  const register = vi.fn();

  beforeEach(() => {
    login.mockReset();
    register.mockReset();
    useAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@example.com' },
      login,
      register,
      logout: vi.fn(),
      theme: 'light',
      setTheme: vi.fn(),
    });
  });

  it('shows login success after navigating to the dashboard', async () => {
    login.mockResolvedValue({});
    renderAuthPage('login');

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Dashboard content')).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent('Login successful! Welcome back.');
    expect(login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'secret123' });
  });

  it('shows registration success after navigating to the dashboard', async () => {
    register.mockResolvedValue({});
    renderAuthPage('register');

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Dashboard content')).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent('Account created successfully! Welcome to HabitPulseAI.');
    expect(register).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'test@example.com',
      password: 'secret123',
      timezone: 'UTC',
    });
  });

  it('shows authentication failures and disables the submit button while pending', async () => {
    let rejectLogin;
    login.mockImplementation(() => new Promise((_resolve, reject) => { rejectLogin = reject; }));
    renderAuthPage('login');

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled();
    rejectLogin({ response: { data: { message: 'Invalid credentials.' } } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled());
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
  });

  it('does not navigate on a registration failure', async () => {
    register.mockRejectedValue({ response: { data: { message: 'Email is already registered.' } } });
    renderAuthPage('register');

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email is already registered.');
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
  });
});
