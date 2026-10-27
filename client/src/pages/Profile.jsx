import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Icon from '../components/Icon.jsx';
import Spinner from '../components/Spinner.jsx';
import { Avatar, StatusPill } from '../components/Primitives.jsx';
import { formatDate } from '../utils/format.js';

export default function Profile() {
  const { user, logout } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const changePassword = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirm) {
      push('New passwords do not match', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.put('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      push('Password updated');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="stack-lg">
      <PageHeader eyebrow="Account" title="Your profile" subtitle="Manage your account details and password." />

      <div className="profile-grid">
        <section className="card profile-card">
          <div className="profile-hero">
            <Avatar name={user?.name} size={76} tone="violet" />
            <div>
              <h2>{user?.name}</h2>
              <p>{user?.email}</p>
              <StatusPill tone={user?.role === 'admin' ? 'violet' : 'info'}>
                {user?.role === 'admin' ? 'Administrator' : 'Teacher'}
              </StatusPill>
            </div>
          </div>

          <div className="profile-details">
            <div className="detail-row">
              <span>Phone</span>
              <strong>{user?.phone || 'Not provided'}</strong>
            </div>
            <div className="detail-row">
              <span>Account created</span>
              <strong>{user?.createdAt ? formatDate(user.createdAt) : '—'}</strong>
            </div>
            <div className="detail-row">
              <span>Last login</span>
              <strong>{user?.lastLoginAt ? formatDate(user.lastLoginAt) : '—'}</strong>
            </div>
            <div className="detail-row">
              <span>Access level</span>
              <strong>
                {user?.role === 'admin'
                  ? 'Full access to students, classes, team and reports'
                  : 'Attendance marking and read-only records'}
              </strong>
            </div>
          </div>

          <button type="button" className="btn btn-outline" onClick={signOut}>
            <Icon name="logout" size={16} />
            Sign out of this device
          </button>
        </section>

        <section className="card password-card">
          <div className="card-head">
            <div>
              <h3>Change password</h3>
              <p>Use at least 6 characters. You will stay signed in on this device.</p>
            </div>
            <span className="stat-icon stat-icon-indigo">
              <Icon name="shield" size={20} />
            </span>
          </div>

          <form className="form-stack" onSubmit={changePassword}>
            <label className="field">
              <span>Current password</span>
              <input
                className="input"
                type="password"
                value={form.currentPassword}
                onChange={update('currentPassword')}
                autoComplete="current-password"
                required
              />
            </label>
            <label className="field">
              <span>New password</span>
              <input
                className="input"
                type="password"
                value={form.newPassword}
                onChange={update('newPassword')}
                minLength={6}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="field">
              <span>Confirm new password</span>
              <input
                className="input"
                type="password"
                value={form.confirm}
                onChange={update('confirm')}
                minLength={6}
                autoComplete="new-password"
                required
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Spinner size={16} />}
              Update password
            </button>
          </form>

          <div className="security-note">
            <Icon name="info" size={16} />
            <p>
              Passwords are hashed with bcrypt before storage. Sessions use signed JWTs that expire after
              7 days.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
