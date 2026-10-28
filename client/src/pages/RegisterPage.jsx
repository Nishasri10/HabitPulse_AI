import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', timezone: 'UTC' });
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create account.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h2 className="text-center mb-4">Create account</h2>
        <form onSubmit={submit}>
          <div className="mb-3">
            <label className="form-label">Full name</label>
            <input className="form-control" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input className="form-control" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Timezone</label>
            <select className="form-select" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Kolkata">Asia/Kolkata</option>
            </select>
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          <button className="btn btn-primary w-100" type="submit">Register</button>
        </form>
        <p className="mt-3 text-center mb-0">Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}
