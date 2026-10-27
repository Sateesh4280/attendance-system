import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Brand from './Brand.jsx';
import Icon from './Icon.jsx';
import { Avatar } from './Primitives.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, todayISO } from '../utils/format.js';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: 'dashboard', end: true },
  { to: '/attendance', label: 'Mark attendance', icon: 'checkSquare' },
  { to: '/students', label: 'Students', icon: 'users' },
  { to: '/classes', label: 'Classes & subjects', icon: 'layers' },
  { to: '/reports', label: 'Reports', icon: 'chart' },
  { to: '/team', label: 'Team', icon: 'shield', adminOnly: true },
];

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const title =
    location.pathname === '/profile'
      ? 'Profile'
      : NAV_ITEMS.find((item) =>
          item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
        )?.label || 'Attendly';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'is-visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="sidebar-top">
          <Brand />
          <button
            type="button"
            className="icon-btn sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <span className="nav-label">Workspace</span>
          {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-tip">
          <span className="sidebar-tip-icon">
            <Icon name="sparkles" size={17} />
          </span>
          <div>
            <strong>Tip</strong>
            <p>Mark a sheet in under 30 seconds. Default status is present.</p>
          </div>
        </div>

        <div className="sidebar-footer">
          <NavLink to="/profile" className="sidebar-user">
            <Avatar name={user?.name} size={40} />
            <span>
              <strong>{user?.name}</strong>
              <small>{user?.role === 'admin' ? 'Administrator' : 'Teacher'}</small>
            </span>
          </NavLink>
          <button type="button" className="icon-btn sidebar-logout" onClick={handleLogout} aria-label="Sign out">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-btn menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" size={20} />
            </button>
            <div>
              <span className="topbar-eyebrow">Attendly</span>
              <h2>{title}</h2>
            </div>
          </div>

          <div className="topbar-right">
            <span className="date-chip">
              <Icon name="calendar" size={16} />
              {formatDate(todayISO())}
            </span>
            <NavLink to="/profile" className="topbar-avatar" aria-label="Open profile">
              <Avatar name={user?.name} size={38} />
            </NavLink>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>

        <footer className="app-footer">
          <span>Attendly · Student Attendance Management System</span>
          <span className="footer-dot" />
          <span>{new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );
}
