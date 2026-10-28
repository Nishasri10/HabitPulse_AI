import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await login(form);
      navigate('/dashboard', { state: { notification: { type: 'success', message: 'Login successful! Welcome back.' } } });
    } catch (err) {
      setError(err.response?.data?.message || (err.response
        ? 'Unable to log in. Check your email and password.'
        : 'Unable to reach the server. Check your connection and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h2 className="text-center mb-4">Welcome back</h2>
        <form onSubmit={submit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input id="login-email" className="form-control" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input id="login-password" className="form-control" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          <button className="btn btn-primary w-100" type="submit" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Login'}
          </button>
        </form>
        <p className="mt-3 text-center mb-0">Need an account? <Link to="/register">Register</Link></p>
      </div>
    </div>
  );
}
