import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import Spinner, { PageLoader } from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Avatar, StatusPill } from '../components/Primitives.jsx';
import { formatDate } from '../utils/format.js';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'teacher', phone: '' };

export default function Team() {
  const { user } = useAuth();
  const { push } = useToast();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setMembers(data.data);
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const addMember = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/users', form);
      push('Team member added');
      setOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member) => {
    setUpdatingId(member._id);
    try {
      await api.put(`/users/${member._id}`, { isActive: !member.isActive });
      push(member.isActive ? 'Account deactivated' : 'Account reactivated');
      await load();
    } catch (error) {
      push(errorMessage(error), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="stack-lg">
      <PageHeader
        eyebrow="Access control"
        title="Team"
        subtitle="Administrators manage the workspace. Teachers can mark attendance and view reports."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            <Icon name="plus" size={18} />
            Add member
          </button>
        }
      />

      <div className="card">
        {loading ? (
          <PageLoader label="Loading team…" />
        ) : members.length === 0 ? (
          <EmptyState icon="shield" title="No team members yet" message="Invite a teacher to get started." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Last login</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member._id}>
                    <td>
                      <div className="cell-person">
                        <Avatar name={member.name} size={36} tone={member.role === 'admin' ? 'violet' : 'brand'} />
                        <div>
                          <strong>
                            {member.name}
                            {member._id === user?._id && <span className="you-tag">You</span>}
                          </strong>
                          <span>{member.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusPill tone={member.role === 'admin' ? 'violet' : 'info'}>
                        {member.role === 'admin' ? 'Administrator' : 'Teacher'}
                      </StatusPill>
                    </td>
                    <td className="muted">{member.phone || '—'}</td>
                    <td className="muted">{member.lastLoginAt ? formatDate(member.lastLoginAt) : 'Never'}</td>
                    <td>
                      <StatusPill tone={member.isActive ? 'success' : 'neutral'}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </StatusPill>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => toggleActive(member)}
                          disabled={member._id === user?._id || updatingId === member._id}
                          title={
                            member._id === user?._id
                              ? 'You cannot deactivate your own account'
                              : member.isActive
                                ? `Deactivate ${member.name}`
                                : `Reactivate ${member.name}`
                          }
                        >
                          {updatingId === member._id ? (
                            <Spinner size={13} />
                          ) : (
                            <Icon name={member.isActive ? 'x' : 'check'} size={13} />
                          )}
                          {member.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add team member"
        subtitle="Create an account for a teacher or another administrator."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="team-form" className="btn btn-primary" disabled={saving}>
              {saving && <Spinner size={16} />}
              Add member
            </button>
          </>
        }
      >
        <form id="team-form" className="form-grid" onSubmit={addMember}>
          <label className="field span-2">
            <span>Full name *</span>
            <input className="input" value={form.name} onChange={update('name')} placeholder="Dr. Anita Nair" required />
          </label>
          <label className="field">
            <span>Email *</span>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="anita@campus.edu"
              required
            />
          </label>
          <label className="field">
            <span>Phone</span>
            <input className="input" value={form.phone} onChange={update('phone')} placeholder="+91 98765 43210" />
          </label>
          <label className="field">
            <span>Temporary password *</span>
            <input
              className="input"
              type="text"
              value={form.password}
              onChange={update('password')}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </label>
          <label className="field">
            <span>Role</span>
            <select className="input" value={form.role} onChange={update('role')}>
              <option value="teacher">Teacher</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
        </form>
      </Modal>
    </div>
  );
}
