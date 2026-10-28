import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, theme, setTheme, updateProfile, changePassword } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [remindersEnabled, setRemindersEnabled] = useState(user?.preferences?.remindersEnabled ?? true);
  const [saving, setSaving] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setName(user?.name || '');
    setTimezone(user?.timezone || 'UTC');
    setRemindersEnabled(user?.preferences?.remindersEnabled ?? true);
  }, [user]);

  const handleThemeChange = async (nextTheme) => {
    setSavingTheme(true);
    setMessage({ type: '', text: '' });
    try {
      await setTheme(nextTheme);
      setMessage({ type: 'success', text: 'Theme preference saved.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Theme changed for this session, but could not be saved to your account.',
      });
    } finally {
      setSavingTheme(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await updateProfile({
        name,
        timezone,
        preferences: {
          theme,
          remindersEnabled,
        },
      });
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Unable to save your profile right now.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setSavingPassword(true);
    setMessage({ type: '', text: '' });

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      setSavingPassword(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New password confirmation does not match.' });
      setSavingPassword(false);
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Password updated successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Unable to update your password right now.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card p-4">
            <h3 className="mb-3">Profile & Settings</h3>
            <form onSubmit={save}>
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label">Timezone</label>
                <select className="form-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="themePreference">Theme</label>
                <select
                  id="themePreference"
                  className="form-select"
                  value={theme}
                  onChange={(event) => handleThemeChange(event.target.value)}
                  disabled={savingTheme}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div className="form-check form-switch mb-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={remindersEnabled}
                  onChange={(e) => setRemindersEnabled(e.target.checked)}
                  id="remindersSwitch"
                />
                <label className="form-check-label" htmlFor="remindersSwitch">
                  Enable daily reminders
                </label>
              </div>

              {message.text && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} mt-2`} role="alert">
                  {message.text}
                </div>
              )}

              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save profile'}
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card p-4">
            <h3 className="mb-3">Change Password</h3>
            <form onSubmit={handlePasswordChange}>
              <div className="mb-3">
                <label className="form-label">Current password</label>
                <input
                  type="password"
                  className="form-control"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">New password</label>
                <input
                  type="password"
                  className="form-control"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Confirm new password</label>
                <input
                  type="password"
                  className="form-control"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>
              <button className="btn btn-outline-primary" type="submit" disabled={savingPassword}>
                {savingPassword ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
