import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import Icon from '../components/Icon.jsx';
import Spinner from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../api/client.js';

const FEATURES = [
  'Mark a full class in seconds with one-tap statuses',
  'Spot at-risk students before they fall behind',
  'Class-wise reports and CSV exports in a click',
];

export default function Login() {
  const { login, register } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });

  const isSetup = mode === 'setup';
  const redirectTo = location.state?.from || '/';

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setShowPassword(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (isSetup && form.password !== form.confirm) {
      push('Passwords do not match', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (isSetup) {
        await register({ name: form.name, email: form.email, password: form.password });
        push('Workspace created. Welcome aboard!');
      } else {
        await login(form.email, form.password);
        push('Welcome back!');
      }
      navigate(redirectTo, { replace: true });
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setMode('login');
    setForm({ name: '', email: 'admin@campus.edu', password: 'Admin@123', confirm: '' });
  };

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="auth-aside-top">
          <Brand />
          <span className="auth-badge">
            <span className="status-dot" /> Live attendance
          </span>
        </div>

        <div className="auth-copy">
          <span className="eyebrow light">Student attendance suite</span>
          <h1>Attendance, without the busywork.</h1>
          <p>
            One clean workspace for classes, students, daily attendance and the reports your
            faculty actually needs.
          </p>
          <ul className="auth-features">
            {FEATURES.map((feature) => (
              <li key={feature}>
                <span className="feature-check">
                  <Icon name="check" size={13} />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-preview">
          <div className="preview-head">
            <span>Today&apos;s attendance</span>
            <span className="preview-live">
              <span className="status-dot" /> Live
            </span>
          </div>
          <strong className="preview-value">94.2%</strong>
          <div className="preview-bars" aria-hidden="true">
            {[62, 84, 71, 92, 88, 97, 94].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="preview-foot">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-mobile-brand">
          <Brand />
        </div>

        <div className="auth-card">
          <span className="eyebrow">{isSetup ? 'First-time setup' : 'Welcome back'}</span>
          <h2>{isSetup ? 'Create your workspace' : 'Sign in to Attendly'}</h2>
          <p className="auth-subtitle">
            {isSetup
              ? 'This creates the first administrator account. You can add teachers later.'
              : 'Use your faculty account to manage attendance.'}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {isSetup && (
              <label className="field">
                <span>Full name</span>
                <input
                  className="input"
                  type="text"
                  value={form.name}
                  onChange={update('name')}
                  placeholder="Priya Deshmukh"
                  autoComplete="name"
                  required
                />
              </label>
            )}

            <label className="field">
              <span>Email address</span>
              <div className="input-icon">
                <Icon name="mail" size={17} />
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="you@campus.edu"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="field">
              <span>Password</span>
              <div className="input-icon">
                <Icon name="shield" size={17} />
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  placeholder={isSetup ? 'At least 6 characters' : 'Enter your password'}
                  autoComplete={isSetup ? 'new-password' : 'current-password'}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {isSetup && (
              <label className="field">
                <span>Confirm password</span>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={update('confirm')}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </label>
            )}

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
              {submitting ? <Spinner size={18} /> : <Icon name="arrowRight" size={18} />}
              {isSetup ? 'Create administrator account' : 'Sign in'}
            </button>
          </form>

          {!isSetup && (
            <button type="button" className="demo-hint" onClick={fillDemo}>
              <Icon name="sparkles" size={16} />
              <span>
                Demo login: <strong>admin@campus.edu</strong> / <strong>Admin@123</strong>
              </span>
              <span className="demo-fill">Fill</span>
            </button>
          )}

          <p className="auth-switch">
            {isSetup ? 'Already have an account?' : 'Setting up Attendly for the first time?'}{' '}
            <button type="button" onClick={() => switchMode(isSetup ? 'login' : 'setup')}>
              {isSetup ? 'Sign in' : 'Create admin account'}
            </button>
          </p>
        </div>

        <p className="auth-foot">
          Built with React, Node.js and MongoDB · <span>© {new Date().getFullYear()} Attendly</span>
        </p>
      </main>
    </div>
  );
}
