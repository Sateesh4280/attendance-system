import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Spinner, { PageLoader } from '../components/Spinner.jsx';
import { Avatar, StatusPill } from '../components/Primitives.jsx';

const EMPTY_CLASS = {
  name: '',
  code: '',
  section: 'A',
  academicYear: '2025-2026',
  room: '',
  teacher: '',
};

function ClassForm({ open, klass, teachers, onClose, onSaved }) {
  const { push } = useToast();
  const [form, setForm] = useState(EMPTY_CLASS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      klass
        ? {
            name: klass.name || '',
            code: klass.code || '',
            section: klass.section || 'A',
            academicYear: klass.academicYear || '',
            room: klass.room || '',
            teacher: klass.teacher?._id || '',
          }
        : EMPTY_CLASS,
    );
  }, [open, klass]);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (klass) {
        await api.put(`/classes/${klass._id}`, form);
        push('Class updated');
      } else {
        await api.post('/classes', form);
        push('Class created');
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
      title={klass ? 'Edit class' : 'Create class'}
      subtitle="Classes group students for attendance and reporting."
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="class-form" className="btn btn-primary" disabled={saving}>
            {saving && <Spinner size={16} />}
            {klass ? 'Save changes' : 'Create class'}
          </button>
        </>
      }
    >
      <form id="class-form" className="form-grid" onSubmit={handleSubmit}>
        <label className="field span-2">
          <span>Class name *</span>
          <input
            className="input"
            value={form.name}
            onChange={update('name')}
            placeholder="e.g. BCA - 3rd Semester"
            required
          />
        </label>
        <label className="field">
          <span>Code *</span>
          <input
            className="input"
            value={form.code}
            onChange={update('code')}
            placeholder="e.g. BCA-3A"
            required
          />
        </label>
        <label className="field">
          <span>Section</span>
          <input className="input" value={form.section} onChange={update('section')} placeholder="A" />
        </label>
        <label className="field">
          <span>Academic year</span>
          <input
            className="input"
            value={form.academicYear}
            onChange={update('academicYear')}
            placeholder="2025-2026"
          />
        </label>
        <label className="field">
          <span>Room</span>
          <input className="input" value={form.room} onChange={update('room')} placeholder="Lab 201" />
        </label>
        <label className="field span-2">
          <span>Class teacher</span>
          <select className="input" value={form.teacher} onChange={update('teacher')}>
            <option value="">Unassigned</option>
            {teachers.map((teacher) => (
              <option key={teacher._id} value={teacher._id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </label>
      </form>
    </Modal>
  );
}

export default function Classes() {
  const { isAdmin } = useAuth();
  const { push } = useToast();

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classModal, setClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [activeClass, setActiveClass] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', creditHours: 3 });
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [confirmSubject, setConfirmSubject] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/classes');
      setClasses(data.data);
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .get('/users/teachers')
      .then(({ data }) => setTeachers(data.data))
      .catch(() => {});
  }, [isAdmin]);

  const openAdd = () => {
    setEditingClass(null);
    setClassModal(true);
  };

  const openEdit = (klass) => {
    setEditingClass(klass);
    setClassModal(true);
  };

  const confirmDeleteClass = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/classes/${pendingDelete._id}`);
      push('Class deleted');
      setPendingDelete(null);
      load();
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openSubjects = async (klass) => {
    setActiveClass(klass);
    setSubjects([]);
    setConfirmSubject(null);
    setSubjectForm({ name: '', code: '', creditHours: 3 });
    setSubjectsLoading(true);
    try {
      const { data } = await api.get('/subjects', { params: { class: klass._id, all: true } });
      setSubjects(data.data);
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setSubjectsLoading(false);
    }
  };

  const reloadSubjects = async (classId) => {
    const { data } = await api.get('/subjects', { params: { class: classId, all: true } });
    setSubjects(data.data);
  };

  const addSubject = async (event) => {
    event.preventDefault();
    if (!activeClass) return;
    setSubjectSaving(true);
    try {
      await api.post('/subjects', {
        ...subjectForm,
        code: subjectForm.code,
        creditHours: Number(subjectForm.creditHours) || 3,
        class: activeClass._id,
      });
      push('Subject added');
      setSubjectForm({ name: '', code: '', creditHours: 3 });
      await reloadSubjects(activeClass._id);
      load();
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setSubjectSaving(false);
    }
  };

  const removeSubject = async (subject) => {
    try {
      await api.delete(`/subjects/${subject._id}`);
      push('Subject deleted');
      setConfirmSubject(null);
      await reloadSubjects(activeClass._id);
      load();
    } catch (error) {
      push(errorMessage(error), 'error');
    }
  };

  return (
    <div className="stack-lg">
      <PageHeader
        eyebrow="Structure"
        title="Classes & subjects"
        subtitle="Organise students into classes, assign teachers and manage each subject."
        actions={
          isAdmin && (
            <button type="button" className="btn btn-primary" onClick={openAdd}>
              <Icon name="plus" size={18} />
              Create class
            </button>
          )
        }
      />

      {loading ? (
        <PageLoader label="Loading classes…" />
      ) : classes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="layers"
            title="No classes yet"
            message="Create a class to group students, add subjects and start marking attendance."
            action={
              isAdmin && (
                <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
                  <Icon name="plus" size={16} /> Create class
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="class-grid">
          {classes.map((klass) => (
            <article key={klass._id} className="class-card">
              <header className="class-card-head">
                <div className="class-icon">
                  <Icon name="layers" size={22} />
                </div>
                <div className="class-title">
                  <h3>{klass.name}</h3>
                  <span className="code-chip">{klass.code}</span>
                </div>
                {isAdmin && (
                  <div className="row-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => openEdit(klass)}
                      aria-label={`Edit ${klass.name}`}
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      onClick={() => setPendingDelete(klass)}
                      aria-label={`Delete ${klass.name}`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                )}
              </header>

              <div className="class-meta">
                <span>Section {klass.section}</span>
                <span className="meta-dot" />
                <span>{klass.academicYear}</span>
                {klass.room && (
                  <>
                    <span className="meta-dot" />
                    <span>{klass.room}</span>
                  </>
                )}
              </div>

              <div className="class-stats">
                <div>
                  <strong>{klass.studentCount}</strong>
                  <span>Students</span>
                </div>
                <div>
                  <strong>{klass.subjectCount}</strong>
                  <span>Subjects</span>
                </div>
                <div>
                  <strong>{klass.isActive ? 'Yes' : 'No'}</strong>
                  <span>Active</span>
                </div>
              </div>

              <footer className="class-card-foot">
                <span className="teacher-chip">
                  <Avatar name={klass.teacher?.name || 'NA'} size={26} tone={klass.teacher ? 'violet' : 'neutral'} />
                  {klass.teacher?.name || 'Unassigned'}
                </span>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => openSubjects(klass)}>
                  <Icon name="book" size={15} />
                  Subjects
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}

      <ClassForm
        open={classModal}
        klass={editingClass}
        teachers={teachers}
        onClose={() => setClassModal(false)}
        onSaved={load}
      />

      <Modal
        open={Boolean(activeClass)}
        onClose={() => setActiveClass(null)}
        title={activeClass ? `${activeClass.name} · ${activeClass.section}` : 'Subjects'}
        subtitle={activeClass ? `${activeClass.code} · ${activeClass.studentCount} students enrolled` : ''}
        size="lg"
      >
        {subjectsLoading ? (
          <PageLoader label="Loading subjects…" />
        ) : (
          <div className="subject-panel">
            <div className="subject-list">
              {subjects.length === 0 ? (
                <EmptyState
                  icon="book"
                  title="No subjects yet"
                  message={isAdmin ? 'Add the first subject below.' : 'An administrator has not added subjects yet.'}
                />
              ) : (
                subjects.map((subject) => (
                  <div key={subject._id} className="subject-row">
                    <div className="subject-main">
                      <span className="subject-icon">
                        <Icon name="book" size={17} />
                      </span>
                      <div>
                        <strong>{subject.name}</strong>
                        <span>
                          {subject.code} · {subject.creditHours} credit hours
                        </span>
                      </div>
                    </div>

                    <div className="subject-actions">
                      {!subject.isActive && <StatusPill tone="neutral">Inactive</StatusPill>}
                      {isAdmin &&
                        (confirmSubject === subject._id ? (
                          <div className="inline-confirm">
                            <span>Delete?</span>
                            <button
                              type="button"
                              className="btn btn-danger btn-xs"
                              onClick={() => removeSubject(subject)}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => setConfirmSubject(null)}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="icon-btn icon-btn-danger"
                            onClick={() => setConfirmSubject(subject._id)}
                            aria-label={`Delete ${subject.name}`}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {isAdmin && (
              <form className="subject-add" onSubmit={addSubject}>
                <h4>Add a subject</h4>
                <div className="subject-add-row">
                  <input
                    className="input"
                    placeholder="Subject name"
                    value={subjectForm.name}
                    onChange={(event) => setSubjectForm((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                  <input
                    className="input"
                    placeholder="Code"
                    value={subjectForm.code}
                    onChange={(event) => setSubjectForm((current) => ({ ...current, code: event.target.value }))}
                    required
                  />
                  <input
                    className="input input-credits"
                    type="number"
                    min="1"
                    max="12"
                    value={subjectForm.creditHours}
                    onChange={(event) =>
                      setSubjectForm((current) => ({ ...current, creditHours: event.target.value }))
                    }
                    aria-label="Credit hours"
                  />
                  <button type="submit" className="btn btn-primary" disabled={subjectSaving}>
                    {subjectSaving ? <Spinner size={16} /> : <Icon name="plus" size={16} />}
                    Add
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete class?"
        subtitle="Its subjects and attendance sheets will also be removed."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDeleteClass} disabled={deleting}>
              {deleting && <Spinner size={16} />}
              Delete class
            </button>
          </>
        }
      >
        <p className="confirm-text">
          Delete <strong>{pendingDelete?.name}</strong>? Classes with enrolled students cannot be deleted until
          those students are moved or removed.
        </p>
      </Modal>
    </div>
  );
}
