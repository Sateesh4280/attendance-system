import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import TrendChart, { SessionRow } from '../components/TrendChart.jsx';
import { Avatar, ProgressBar, StatusPill } from '../components/Primitives.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { PageLoader } from '../components/Spinner.jsx';
import Icon from '../components/Icon.jsx';
import { formatDate, todayISO } from '../utils/format.js';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Prefer the given name, but keep honorifics such as "Dr." attached. */
function displayName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'there';
  if (/^(dr|prof|mr|mrs|ms|miss)\.?$/i.test(parts[0])) {
    return parts.slice(0, 2).join(' ');
  }
  return parts[0];
}

export default function Dashboard() {
  const { user } = useAuth();
  const { push } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await api.get('/dashboard', { params: { date: todayISO() } });
      setData(response.data.data);
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageLoader label="Loading your dashboard…" />;

  const stats = data?.stats || {};
  const totalMarked = stats.todayTotal || 0;

  return (
    <div className="stack-lg">
      <PageHeader
        eyebrow={formatDate(todayISO(), { weekday: 'long' })}
        title={`${greeting()}, ${displayName(user?.name)}`}
        subtitle={
          totalMarked
            ? `${stats.todayAttended} of ${totalMarked} attendance records are marked present today.`
            : 'No attendance has been marked yet today — start with your first class.'
        }
        actions={
          <Link to="/attendance" className="btn btn-primary">
            <Icon name="checkSquare" size={18} />
            Mark attendance
          </Link>
        }
      />

      <section className="stat-grid">
        <StatCard
          label="Active students"
          value={stats.students ?? 0}
          hint={`${stats.teachers ?? 0} teachers on the team`}
          icon="users"
          tone="indigo"
        />
        <StatCard
          label="Classes"
          value={stats.classes ?? 0}
          hint={`${stats.subjects ?? 0} active subjects`}
          icon="layers"
          tone="violet"
        />
        <StatCard
          label="Today's attendance"
          value={`${stats.todayPercentage ?? 0}%`}
          hint={totalMarked ? `${totalMarked} records marked` : 'Awaiting the first session'}
          icon="checkSquare"
          tone="emerald"
        />
        <StatCard
          label="Classes today"
          value={data?.classesToday?.length ?? 0}
          hint="Sessions with attendance marked"
          icon="calendar"
          tone="amber"
        />
      </section>

      <section className="dash-grid">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Attendance trend</h3>
              <p>Last 7 days across all classes</p>
            </div>
            <span className="pill pill-brand">
              <Icon name="chart" size={13} /> Weekly
            </span>
          </div>
          <TrendChart data={data?.trend || []} />
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Today by class</h3>
              <p>Present and late records combined</p>
            </div>
          </div>

          {data?.classesToday?.length ? (
            <div className="class-attendance-list">
              {data.classesToday.map((row) => (
                <div key={row._id} className="class-attendance-item">
                  <div className="class-attendance-head">
                    <div>
                      <strong>{row.name}</strong>
                      <span>
                        {row.code} · Section {row.section}
                      </span>
                    </div>
                    <span className={`percentage tone-${row.percentage >= 85 ? 'success' : row.percentage >= 75 ? 'warning' : 'danger'}`}>
                      {row.percentage}%
                    </span>
                  </div>
                  <ProgressBar
                    value={row.percentage}
                    tone={row.percentage >= 85 ? 'success' : row.percentage >= 75 ? 'warning' : 'danger'}
                  />
                  <span className="muted-xs">
                    {row.attended} of {row.total} students attended
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="calendar"
              title="Nothing marked yet"
              message="Today's class breakdown will appear once a session is saved."
              action={
                <Link to="/attendance" className="btn btn-outline btn-sm">
                  Mark a session
                </Link>
              }
            />
          )}
        </div>
      </section>

      <section className="dash-grid dash-grid-even">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Low attendance watchlist</h3>
              <p>Below 75% over the last 30 days</p>
            </div>
            <Link to="/reports" className="link-inline">
              View reports <Icon name="arrowRight" size={14} />
            </Link>
          </div>

          {data?.lowAttendance?.length ? (
            <div className="table-wrap">
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th className="text-center">Attended</th>
                    <th className="text-right">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lowAttendance.map((row) => (
                    <tr key={row.studentId}>
                      <td>
                        <div className="cell-person">
                          <Avatar name={row.name} size={32} tone="danger" />
                          <div>
                            <strong>{row.name}</strong>
                            <span>{row.rollNo}</span>
                          </div>
                        </div>
                      </td>
                      <td className="muted">{row.className}</td>
                      <td className="muted">
                        {row.attended}/{row.total}
                      </td>
                      <td className="text-right">
                        <StatusPill tone="danger">{row.percentage}%</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="shield"
              title="Everyone is on track"
              message="No student is currently below the 75% threshold."
            />
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Recent sessions</h3>
              <p>Last five attendance sheets</p>
            </div>
            <Link to="/reports" className="link-inline">
              All <Icon name="arrowRight" size={14} />
            </Link>
          </div>

          {data?.recent?.length ? (
            <div className="session-list">
              {data.recent.map((session) => (
                <SessionRow key={session._id} session={session} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="checkSquare"
              title="No sessions yet"
              message="Saved attendance sheets will show up here."
            />
          )}
        </div>
      </section>
    </div>
  );
}
