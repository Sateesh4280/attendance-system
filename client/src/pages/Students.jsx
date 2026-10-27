import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Spinner, { PageLoader } from '../components/Spinner.jsx';
import { Avatar, StatusPill } from '../components/Primitives.jsx';
import { classLabel } from '../utils/format.js';

const EMPTY_FORM = {
  name: '',
  rollNo: '',
  class: '',
  email: '',
  phone: '',
  guardianName: '',
  guardianPhone: '',
  status: 'active',
};

function StudentForm({ open, student, classes, onClose, onSaved }) {
  const { push } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      student
        ? {
            name: student.name || '',
            rollNo: student.rollNo || '',
            class: student.class?._id || student.class || '',
            email: student.email || '',
            phone: student.phone || '',
            guardianName: student.guardianName || '',
            guardianPhone: student.guardianPhone || '',
            status: student.status || 'active',
          }
        : { ...EMPTY_FORM, class: classes[0]?._id || '' },
    );
  }, [open, student, classes]);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (student) {
        await api.put(`/students/${student._id}`, form);
        push('Student updated');
      } else {
        await api.post('/students', form);
        push('Student added');
      }
      onSaved();
      onClose();
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student ? 'Edit student' : 'Add student'}
      subtitle={student ? 'Update the student record below.' : 'Enrol a student into a class.'}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="student-form" className="btn btn-primary" disabled={saving}>
            {saving && <Spinner size={16} />}
            {student ? 'Save changes' : 'Add student'}
          </button>
        </>
      }
    >
      <form id="student-form" onSubmit={handleSubmit} className="form-grid">
        <label className="field span-2">
          <span>Full name *</span>
          <input className="input" value={form.name} onChange={update('name')} placeholder="e.g. Aarav Sharma" required />
        </label>

        <label className="field">
          <span>Roll number *</span>
          <input
            className="input"
            value={form.rollNo}
            onChange={update('rollNo')}
            placeholder="e.g. BCA23001"
            required
          />
        </label>

        <label className="field">
          <span>Class *</span>
          <select className="input" value={form.class} onChange={update('class')} required>
            <option value="">Select a class</option>
            {classes.map((klass) => (
              <option key={klass._id} value={klass._id}>
                {klass.name} · {klass.section}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={update('email')}
            placeholder="student@campus.edu"
          />
        </label>

        <label className="field">
          <span>Phone</span>
          <input className="input" value={form.phone} onChange={update('phone')} placeholder="+91 98765 43210" />
        </label>

        <label className="field">
          <span>Guardian name</span>
          <input
            className="input"
            value={form.guardianName}
            onChange={update('guardianName')}
            placeholder="Parent or guardian"
          />
        </label>

        <label className="field">
          <span>Guardian phone</span>
          <input
            className="input"
            value={form.guardianPhone}
            onChange={update('guardianPhone')}
            placeholder="+91 98765 43210"
          />
        </label>

        {student && (
          <label className="field">
            <span>Status</span>
            <select className="input" value={form.status} onChange={update('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        )}
      </form>
    </Modal>
  );
}

export default function Students() {
  const { isAdmin } = useAuth();
  const { push } = useToast();

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get('/classes')
      .then(({ data }) => setClasses(data.data))
      .catch((error) => push(errorMessage(error), 'error'));
  }, [push]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/students', {
        params: { page, limit: 10, q: query || undefined, class: classFilter || undefined, status: statusFilter },
      });
      setStudents(data.data);
      setMeta(data.meta);
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [page, query, classFilter, statusFilter, push]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (student) => {
    setEditing(student);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/students/${pendingDelete._id}`);
      push('Student removed');
      setPendingDelete(null);
      load();
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="stack-lg">
      <PageHeader
        eyebrow="Directory"
        title="Students"
        subtitle="Search, filter and maintain every student enrolled in your classes."
        actions={
          isAdmin && (
            <button type="button" className="btn btn-primary" onClick={openAdd}>
              <Icon name="plus" size={18} />
              Add student
            </button>
          )
        }
      />

      <div className="card">
        <div className="toolbar">
          <div className="search-box">
            <Icon name="search" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, roll number, email…"
              aria-label="Search students"
            />
          </div>

          <div className="toolbar-group">
            <select
              className="input input-sm"
              value={classFilter}
              onChange={(event) => {
                setClassFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by class"
            >
              <option value="">All classes</option>
              {classes.map((klass) => (
                <option key={klass._id} value={klass._id}>
                  {klass.name} · {klass.section}
                </option>
              ))}
            </select>

            <select
              className="input input-sm"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All statuses</option>
            </select>
          </div>
        </div>

        {loading ? (
          <PageLoader label="Loading students…" />
        ) : students.length === 0 ? (
          <EmptyState
            icon="users"
            title={query || classFilter ? 'No students match your filters' : 'No students yet'}
            message={
              query || classFilter
                ? 'Try a different search term or clear the class filter.'
                : 'Add your first student to start marking attendance.'
            }
            action={
              isAdmin && (
                <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
                  <Icon name="plus" size={16} /> Add student
                </button>
              )
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll no</th>
                    <th>Class</th>
                    <th>Contact</th>
                    <th>Status</th>
                    {isAdmin && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td>
                        <div className="cell-person">
                          <Avatar name={student.name} size={36} />
                          <div>
                            <strong>{student.name}</strong>
                            <span>{student.email || 'No email'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="code-chip">{student.rollNo}</span>
                      </td>
                      <td className="muted">{classLabel(student.class)}</td>
                      <td className="muted">
                        {student.phone || student.guardianPhone || '—'}
                      </td>
                      <td>
                        <StatusPill tone={student.status === 'active' ? 'success' : 'neutral'}>
                          {student.status}
                        </StatusPill>
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => openEdit(student)}
                              aria-label={`Edit ${student.name}`}
                            >
                              <Icon name="edit" size={17} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn icon-btn-danger"
                              onClick={() => setPendingDelete(student)}
                              aria-label={`Delete ${student.name}`}
                            >
                              <Icon name="trash" size={17} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPageChange={setPage} />
          </>
        )}
      </div>

      <StudentForm
        open={formOpen}
        student={editing}
        classes={classes}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete student?"
        subtitle="This also removes their attendance entries. This action cannot be undone."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Spinner size={16} />}
              Delete student
            </button>
          </>
        }
      >
        <p className="confirm-text">
          You are about to delete <strong>{pendingDelete?.name}</strong> ({pendingDelete?.rollNo}) from the
          directory.
        </p>
      </Modal>
    </div>
  );
}
