import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', timezone: 'UTC' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await register(form);
      navigate('/dashboard', { state: { notification: { type: 'success', message: 'Account created successfully! Welcome to HabitPulseAI.' } } });
    } catch (err) {
      setError(err.response?.data?.message || (err.response
        ? 'Unable to create your account. Review your details and try again.'
        : 'Unable to reach the server. Check your connection and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h2 className="text-center mb-4">Create account</h2>
        <form onSubmit={submit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="register-name">Full name</label>
            <input id="register-name" className="form-control" type="text" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="register-email">Email</label>
            <input id="register-email" className="form-control" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="register-password">Password</label>
            <input id="register-password" className="form-control" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="register-timezone">Timezone</label>
            <select id="register-timezone" className="form-select" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Kolkata">Asia/Kolkata</option>
            </select>
          </div>
          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          <button className="btn btn-primary w-100" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Register'}
          </button>
        </form>
        <p className="mt-3 text-center mb-0">Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}
