import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Icon from '../components/Icon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { PageLoader, default as Spinner } from '../components/Spinner.jsx';
import { Avatar, ProgressBar, StatusPill } from '../components/Primitives.jsx';
import { MiniStat } from '../components/StatCard.jsx';
import {
  attendanceLabel,
  attendanceTone,
  classLabel,
  formatDate,
  shiftISO,
  todayISO,
} from '../utils/format.js';

export default function Reports() {
  const { push } = useToast();

  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState(shiftISO(-29));
  const [to, setTo] = useState(todayISO());
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api
      .get('/classes')
      .then(({ data }) => setClasses(data.data))
      .catch((error) => push(errorMessage(error), 'error'));
  }, [push]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance/summary', {
        params: { class: classId || undefined, from, to },
      });
      setRows(data.data);
      setMeta(data.meta);
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [classId, from, to, push]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.student.name.toLowerCase().includes(term) ||
        row.student.rollNo.toLowerCase().includes(term),
    );
  }, [rows, search]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await api.get('/attendance/export', {
        params: { class: classId || undefined, from, to },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_${from}_to_${to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      push('CSV report downloaded');
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setExporting(false);
    }
  };

  const atRiskRows = rows.filter((row) => row.sessions > 0 && row.percentage < 75);

  return (
    <div className="stack-lg">
      <PageHeader
        eyebrow="Insights"
        title="Attendance reports"
        subtitle="Understand attendance over any date range and export a CSV for records."
        actions={
          <button type="button" className="btn btn-primary" onClick={exportCsv} disabled={exporting}>
            {exporting ? <Spinner size={17} /> : <Icon name="download" size={17} />}
            Export CSV
          </button>
        }
      />

      <div className="card filter-card">
        <div className="filter-grid">
          <label className="field">
            <span>Class</span>
            <select className="input" value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="">All classes</option>
              {classes.map((klass) => (
                <option key={klass._id} value={klass._id}>
                  {klass.name} · {klass.section}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>From</span>
            <input
              className="input"
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>

          <label className="field">
            <span>To</span>
            <input
              className="input"
              type="date"
              value={to}
              min={from}
              max={todayISO()}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>

          <div className="search-box filter-search">
            <Icon name="search" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a student…"
              aria-label="Search report rows"
            />
          </div>
        </div>
      </div>

      <div className="stat-grid stat-grid-4">
        <MiniStat label="Average attendance" value={`${meta?.average ?? 0}%`} tone="brand" />
        <MiniStat label="Students below 75%" value={meta?.atRisk ?? 0} tone={meta?.atRisk ? 'danger' : 'success'} />
        <MiniStat label="Sessions recorded" value={meta?.sessions ?? 0} tone="violet" />
        <MiniStat label="Students in scope" value={meta?.totalStudents ?? 0} tone="info" />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Student summary</h3>
            <p>
              {meta ? `${formatDate(meta.from)} — ${formatDate(meta.to)}` : 'Selected range'} · Present and late
              count as attended
            </p>
          </div>
          {atRiskRows.length > 0 && (
            <span className="pill pill-danger">
              <Icon name="alert" size={13} /> {atRiskRows.length} at risk
            </span>
          )}
        </div>

        {loading ? (
          <PageLoader label="Crunching attendance…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="chart"
            title={search ? 'No students match that search' : 'Nothing to report yet'}
            message={
              search
                ? 'Try a different name or roll number.'
                : 'Mark attendance for this class and date range to see the summary.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th className="text-center">Sessions</th>
                  <th className="text-center">P</th>
                  <th className="text-center">A</th>
                  <th className="text-center">L</th>
                  <th className="text-center">E</th>
                  <th>Attendance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.student._id}>
                    <td>
                      <div className="cell-person">
                        <Avatar name={row.student.name} size={34} />
                        <div>
                          <strong>{row.student.name}</strong>
                          <span>{row.student.rollNo}</span>
                        </div>
                      </div>
                    </td>
                    <td className="muted">{classLabel(row.class)}</td>
                    <td className="text-center muted">{row.sessions}</td>
                    <td className="text-center">
                      <span className="count count-success">{row.present}</span>
                    </td>
                    <td className="text-center">
                      <span className="count count-danger">{row.absent}</span>
                    </td>
                    <td className="text-center">
                      <span className="count count-warning">{row.late}</span>
                    </td>
                    <td className="text-center">
                      <span className="count count-info">{row.excused}</span>
                    </td>
                    <td>
                      <div className="report-meter">
                        <ProgressBar value={row.percentage} tone={attendanceTone(row.percentage)} thin />
                        <span>{row.percentage}%</span>
                      </div>
                    </td>
                    <td>
                      <StatusPill tone={attendanceTone(row.percentage)}>
                        {row.sessions ? attendanceLabel(row.percentage) : 'No data'}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="footnote">
        <Icon name="info" size={15} />
        Attendance % is calculated as (present + late) ÷ total sessions. Excused absences are tracked
        separately and are not counted as attended.
      </p>
    </div>
  );
}
