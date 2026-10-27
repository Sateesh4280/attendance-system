import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Icon from '../components/Icon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Spinner, { PageLoader } from '../components/Spinner.jsx';
import { Avatar } from '../components/Primitives.jsx';
import {
  ATTENDANCE_STATUSES,
  STATUS_META,
  classLabel,
  formatDate,
  todayISO,
} from '../utils/format.js';

const SEGMENT_LABELS = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
};

export default function MarkAttendance() {
  const { push } = useToast();

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(todayISO());

  const [roster, setRoster] = useState([]);
  const [records, setRecords] = useState({});
  const [existing, setExisting] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedAt, setLoadedAt] = useState(null);
  const requestRef = useRef(0);

  const activeClass = useMemo(() => classes.find((klass) => klass._id === classId), [classes, classId]);
  const activeSubject = useMemo(() => subjects.find((subject) => subject._id === subjectId), [subjects, subjectId]);

  useEffect(() => {
    api
      .get('/classes')
      .then(({ data }) => {
        setClasses(data.data);
        setClassId((current) => current || data.data[0]?._id || '');
      })
      .catch((error) => push(errorMessage(error), 'error'));
  }, [push]);

  useEffect(() => {
    if (!classId) {
      setSubjects([]);
      setSubjectId('');
      return undefined;
    }

    let active = true;
    api
      .get('/subjects', { params: { class: classId } })
      .then(({ data }) => {
        if (!active) return;
        setSubjects(data.data);
        setSubjectId((current) =>
          data.data.some((subject) => subject._id === current) ? current : data.data[0]?._id || '',
        );
      })
      .catch((error) => {
        if (active) push(errorMessage(error), 'error');
      });

    return () => {
      active = false;
    };
  }, [classId, push]);

  const loadSession = useCallback(async () => {
    if (!classId || !subjectId || !date) {
      requestRef.current += 1;
      setRoster([]);
      setExisting(null);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setSessionLoading(true);
    try {
      const { data } = await api.get('/attendance/session', {
        params: { class: classId, subject: subjectId, date },
      });
      if (requestId !== requestRef.current) return;

      const { students, attendance } = data.data;

      const nextRecords = {};
      students.forEach((student) => {
        const saved = attendance?.records?.find(
          (record) => String(record.student?._id || record.student) === student._id,
        );
        nextRecords[student._id] = {
          status: saved?.status || 'present',
          remark: saved?.remark || '',
        };
      });

      setRoster(students);
      setExisting(attendance || null);
      setRecords(nextRecords);
      setLoadedAt(new Date());
    } catch (error) {
      if (requestId !== requestRef.current) return;
      push(errorMessage(error), 'error');
      setRoster([]);
      setExisting(null);
    } finally {
      if (requestId === requestRef.current) setSessionLoading(false);
    }
  }, [classId, subjectId, date, push]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const counts = useMemo(() => {
    const totals = { present: 0, absent: 0, late: 0, excused: 0 };
    roster.forEach((student) => {
      const status = records[student._id]?.status || 'present';
      if (totals[status] !== undefined) totals[status] += 1;
    });
    return { ...totals, total: roster.length };
  }, [roster, records]);

  const setStatus = (studentId, status) => {
    setRecords((current) => ({
      ...current,
      [studentId]: { ...current[studentId], status },
    }));
  };

  const setRemark = (studentId, remark) => {
    setRecords((current) => ({
      ...current,
      [studentId]: { ...current[studentId], remark },
    }));
  };

  const markAll = (status) => {
    const next = {};
    roster.forEach((student) => {
      next[student._id] = { status, remark: records[student._id]?.remark || '' };
    });
    setRecords(next);
  };

  const handleSave = async () => {
    if (!roster.length || !classId || !subjectId) return;
    setSaving(true);
    try {
      const payload = roster.map((student) => ({
        student: student._id,
        status: records[student._id]?.status || 'present',
        remark: records[student._id]?.remark?.trim() || '',
      }));

      const { data } = await api.post('/attendance', {
        class: classId,
        subject: subjectId,
        date,
        records: payload,
      });

      setExisting(data.data);
      setLoadedAt(new Date());
      push(`Attendance saved for ${roster.length} students`);
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const hasSubjects = subjects.length > 0;
  const showRoster = Boolean(classId && subjectId);

  return (
    <div className="stack-lg">
      <PageHeader
        eyebrow="Daily register"
        title="Mark attendance"
        subtitle="Pick a class, subject and date. Every student starts as present — adjust only the exceptions."
        actions={
          <Link to="/reports" className="btn btn-outline">
            <Icon name="chart" size={17} />
            View reports
          </Link>
        }
      />

      <div className="card attendance-selector">
        <label className="field">
          <span>Class</span>
          <select
            className="input"
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value);
              setSubjects([]);
              setSubjectId('');
            }}
          >
            {classes.length === 0 && <option value="">No classes available</option>}
            {classes.map((klass) => (
              <option key={klass._id} value={klass._id}>
                {klass.name} · {klass.section}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Subject</span>
          <select
            className="input"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            disabled={!hasSubjects}
          >
            {!hasSubjects && <option value="">No subjects for this class</option>}
            {subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Date</span>
          <input
            className="input"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>

        <div className="selector-status">
          {existing ? (
            <span className="pill pill-success">
              <Icon name="checkCircle" size={13} />
              Saved
            </span>
          ) : (
            <span className="pill pill-neutral">New sheet</span>
          )}
          <small>Loaded at {loadedAt ? loadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</small>
        </div>
      </div>

      {!classes.length ? (
        <div className="card">
          <EmptyState
            icon="layers"
            title="Create a class first"
            message="Attendance is marked against a class and subject. Set those up before starting."
            action={
              <Link to="/classes" className="btn btn-primary btn-sm">
                Go to classes
              </Link>
            }
          />
        </div>
      ) : !hasSubjects ? (
        <div className="card">
          <EmptyState
            icon="book"
            title="No subjects in this class"
            message="Add at least one subject to the selected class so attendance can be recorded."
            action={
              <Link to="/classes" className="btn btn-primary btn-sm">
                Manage subjects
              </Link>
            }
          />
        </div>
      ) : sessionLoading ? (
        <PageLoader label="Loading the roster…" />
      ) : !showRoster ? null : roster.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="users"
            title="No active students"
            message="There are no active students in this class yet."
            action={
              <Link to="/students" className="btn btn-primary btn-sm">
                Add students
              </Link>
            }
          />
        </div>
      ) : (
        <div className="card roster-card">
          <div className="roster-head">
            <div>
              <span className="eyebrow">Register</span>
              <h3>{activeSubject?.name}</h3>
              <p>
                {activeClass ? classLabel(activeClass) : 'Class'} · {formatDate(date, { weekday: 'short' })} ·{' '}
                {roster.length} students
              </p>
            </div>
            <div className="roster-head-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => markAll('present')}>
                <Icon name="check" size={15} />
                All present
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => markAll('absent')}>
                All absent
              </button>
            </div>
          </div>

          <div className="roster-legend">
            {ATTENDANCE_STATUSES.map((status) => (
              <span key={status} className={`legend-item tone-${STATUS_META[status].tone}`}>
                <span className="legend-dot" />
                {STATUS_META[status].label}
                <strong>{counts[status]}</strong>
              </span>
            ))}
          </div>

          <div className="roster-list">
            {roster.map((student, index) => {
              const record = records[student._id] || { status: 'present', remark: '' };
              return (
                <div className="roster-row" key={student._id}>
                  <span className="roster-index">{String(index + 1).padStart(2, '0')}</span>
                  <Avatar name={student.name} size={38} tone={record.status === 'absent' ? 'danger' : 'brand'} />
                  <div className="roster-student">
                    <strong>{student.name}</strong>
                    <span>{student.rollNo}</span>
                  </div>

                  <input
                    className="input remark-input"
                    placeholder="Optional note"
                    value={record.remark}
                    onChange={(event) => setRemark(student._id, event.target.value)}
                    aria-label={`Note for ${student.name}`}
                  />

                  <div className="segmented" role="group" aria-label={`Status for ${student.name}`}>
                    {ATTENDANCE_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={`seg seg-${status} ${record.status === status ? 'is-active' : ''}`}
                        onClick={() => setStatus(student._id, status)}
                        aria-pressed={record.status === status}
                        title={SEGMENT_LABELS[status]}
                      >
                        <span className="seg-short">{STATUS_META[status].short}</span>
                        <span className="seg-full">{SEGMENT_LABELS[status]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="roster-foot">
            <div className="roster-summary">
              <span>
                <strong>{counts.present + counts.late}</strong> attending
              </span>
              <span className="meta-dot" />
              <span>
                <strong>{counts.absent}</strong> absent
              </span>
              {existing && (
                <>
                  <span className="meta-dot" />
                  <span className="muted-xs">
                    Last saved {existing.updatedAt ? formatDate(existing.updatedAt) : 'earlier'}
                    {existing.markedBy?.name ? ` by ${existing.markedBy.name}` : ''}
                  </span>
                </>
              )}
            </div>

            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size={17} /> : <Icon name="check" size={17} />}
              {existing ? 'Update attendance' : 'Save attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
