import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { formatPhone, isValidPhone } from '../phone';
import {
  FeedbackSource, Modal, PriorityBadge, ShareFeedbackLink, StatusBadge, Stars, Timeline, STATUS_LABEL, fmtDate, fmtDateTime,
} from '../components/ui';
import useTaskFromUrl from '../useTaskFromUrl';

const EMPTY_TASK = {
  title: '', description: '', customerName: '', customerPhone: '', location: '', priority: 'medium', dueDate: '', assignedTo: '',
};

export default function AdminDashboard() {
  const [tab, setTab] = useState('tasks');
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [filters, setFilters] = useState({ status: '', worker: '' });
  const [editing, setEditing] = useState(null); // task object, or EMPTY_TASK for new
  const [viewing, setViewing] = useState(null);
  const [addingWorker, setAddingWorker] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
      const [s, t, w, f] = await Promise.all([
        api('/tasks/stats'),
        api(`/tasks${qs ? `?${qs}` : ''}`),
        api('/users'),
        api('/tasks/feedback'),
      ]);
      setStats(s);
      setTasks(t);
      setWorkers(w);
      setFeedback(f);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [filters]);

  useEffect(() => {
    load();
    window.addEventListener('biligiri:new-notification', load);
    return () => window.removeEventListener('biligiri:new-notification', load);
  }, [load]);

  // Opened from a notification (?task=<id>)
  useTaskFromUrl(setViewing);

  const deleteTask = async (task) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      await api(`/tasks/${task._id}`, { method: 'DELETE' });
      setViewing(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteWorker = async (w) => {
    if (!confirm(`Remove worker ${w.name}?`)) return;
    try {
      await api(`/users/${w._id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      {error && <div className="alert">{error}</div>}

      {stats && (
        <div className="stats">
          <Stat label="Total tasks" value={stats.total} />
          <Stat label="Pending" value={stats.pending} tone="pending" />
          <Stat label="In progress" value={stats.in_progress} tone="in_progress" />
          <Stat label="Completed" value={stats.completed} tone="completed" />
          <Stat label="Workers" value={stats.workers} />
          <Stat
            label={`Avg rating (${stats.feedbackCount})`}
            value={stats.avgRating ? `${stats.avgRating} ★` : '—'}
          />
        </div>
      )}

      <div className="tabs">
        {[
          ['tasks', 'Tasks'],
          ['workers', 'Workers'],
          ['feedback', `Feedback (${feedback.length})`],
        ].map(([k, label]) => (
          <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <section className="card table-card">
          <div className="toolbar">
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filters.worker} onChange={(e) => setFilters({ ...filters, worker: e.target.value })}>
              <option value="">All workers</option>
              {workers.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
            </select>
            <div className="spacer" />
            <button
              className="btn primary"
              disabled={!workers.length}
              title={workers.length ? '' : 'Add a worker first'}
              onClick={() => setEditing(EMPTY_TASK)}
            >
              + Assign task
            </button>
          </div>
          {!workers.length && <p className="muted">Add a worker in the Workers tab before assigning tasks.</p>}
          <div className="table-wrap">
            <table className="stack">
              <thead>
                <tr>
                  <th>Task</th><th>Worker</th><th>Customer</th><th>Priority</th>
                  <th>Status</th><th>Due</th><th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t._id} className="clickable" onClick={() => setViewing(t)}>
                    <td className="cell-title"><strong>{t.title}</strong></td>
                    <td data-label="Worker">{t.assignedTo?.name || <span className="muted">Removed</span>}</td>
                    <td data-label="Customer">{t.customerName || '—'}</td>
                    <td data-label="Priority"><PriorityBadge priority={t.priority} /></td>
                    <td data-label="Status"><StatusBadge status={t.status} /></td>
                    <td data-label="Due">{fmtDate(t.dueDate)}</td>
                    <td data-label="Feedback">{t.feedback ? <Stars value={t.feedback.rating} /> : <span className="muted">—</span>}</td>
                  </tr>
                ))}
                {!tasks.length && (
                  <tr><td colSpan={7} className="muted center">No tasks found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'workers' && (
        <section className="card table-card">
          <div className="toolbar">
            <div className="spacer" />
            <button className="btn primary" onClick={() => setAddingWorker(true)}>+ Add worker</button>
          </div>
          <div className="table-wrap">
            <table className="stack">
              <thead>
                <tr><th>Name</th><th>Phone</th><th>Email</th><th>Pending</th><th>In progress</th><th>Completed</th><th /></tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w._id}>
                    <td className="cell-title"><strong>{w.name}</strong></td>
                    <td data-label="Phone">{formatPhone(w.phone) || '—'}</td>
                    <td data-label="Email" className="cell-wrap">{w.email || '—'}</td>
                    <td data-label="Pending">{w.taskCounts.pending}</td>
                    <td data-label="In progress">{w.taskCounts.in_progress}</td>
                    <td data-label="Completed">{w.taskCounts.completed}</td>
                    <td className="right cell-actions">
                      <button className="btn ghost small" onClick={() => { setFilters({ status: '', worker: w._id }); setTab('tasks'); }}>
                        View tasks
                      </button>
                      <button className="btn danger small" onClick={() => deleteWorker(w)}>Remove</button>
                    </td>
                  </tr>
                ))}
                {!workers.length && <tr><td colSpan={7} className="muted center">No workers yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'feedback' && (
        <section className="feedback-grid">
          {feedback.map((t) => (
            <div key={t._id} className="card feedback-card">
              <div className="row-between">
                <Stars value={t.feedback.rating} />
                <FeedbackSource feedback={t.feedback} />
              </div>
              {t.feedback.comment && <p className="quote">“{t.feedback.comment}”</p>}
              <div className="small">
                <div><strong>{t.feedback.customerName || 'Customer'}</strong> on <em>{t.title}</em></div>
                <div className="muted">Worker: {t.assignedTo?.name || 'Removed'} · {fmtDateTime(t.feedback.submittedAt)}</div>
              </div>
            </div>
          ))}
          {!feedback.length && <div className="card muted center">No customer feedback yet.</div>}
        </section>
      )}

      {editing && (
        <TaskForm
          task={editing}
          workers={workers}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setViewing(null); load(); }}
        />
      )}

      {viewing && (
        <TaskDetail
          task={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => setEditing(viewing)}
          onDelete={() => deleteTask(viewing)}
          onChanged={(t) => { setViewing(t); load(); }}
        />
      )}

      {addingWorker && (
        <WorkerForm onClose={() => setAddingWorker(false)} onSaved={() => { setAddingWorker(false); load(); }} />
      )}
    </>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`card stat ${tone ? `tone-${tone}` : ''}`}>
      <div className="stat-value">{value}</div>
      <div className="muted small">{label}</div>
    </div>
  );
}

function TaskForm({ task, workers, onClose, onSaved }) {
  const isNew = !task._id;
  const [form, setForm] = useState({
    ...EMPTY_TASK,
    ...task,
    assignedTo: task.assignedTo?._id || task.assignedTo || '',
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    customerPhone: task.customerPhone || '',
  });
  const phoneError = form.customerPhone && !isValidPhone(form.customerPhone) ? 'Enter a valid 10-digit mobile number' : '';
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (phoneError) return setError(phoneError);
    const body = {
      title: form.title, description: form.description, customerName: form.customerName, customerPhone: form.customerPhone,
      location: form.location, priority: form.priority, dueDate: form.dueDate, assignedTo: form.assignedTo,
    };
    try {
      await api(isNew ? '/tasks' : `/tasks/${task._id}`, { method: isNew ? 'POST' : 'PUT', body });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal title={isNew ? 'Assign new task' : 'Edit task'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        {error && <div className="alert">{error}</div>}
        <label>Title<input value={form.title} onChange={set('title')} required /></label>
        <label>Description<textarea rows={3} value={form.description} onChange={set('description')} /></label>
        <div className="grid2">
          <label>Customer name<input value={form.customerName} onChange={set('customerName')} /></label>
          <label>
            <span>Customer phone <span className="muted small">(for WhatsApp link)</span></span>
            <input
              type="tel"
              inputMode="tel"
              maxLength={16}
              placeholder="98765 43210"
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value.replace(/[^\d+\s-]/g, '') })}
              className={phoneError ? 'invalid' : ''}
            />
            {phoneError && <span className="field-error">{phoneError}</span>}
          </label>
        </div>
        <label>Location<input value={form.location} onChange={set('location')} /></label>
        <div className="grid3">
          <label>Assign to
            <select value={form.assignedTo} onChange={set('assignedTo')} required>
              <option value="">Select worker…</option>
              {workers.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
            </select>
          </label>
          <label>Priority
            <select value={form.priority} onChange={set('priority')}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </label>
          <label>Due date<input type="date" value={form.dueDate} onChange={set('dueDate')} /></label>
        </div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary">{isNew ? 'Assign task' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  );
}

function TaskDetail({ task, onClose, onEdit, onDelete, onChanged }) {
  const [note, setNote] = useState('');

  const changeStatus = async (status) => {
    try {
      onChanged(await api(`/tasks/${task._id}`, { method: 'PUT', body: { status } }));
    } catch (err) {
      alert(err.message);
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      onChanged(await api(`/tasks/${task._id}/updates`, { method: 'POST', body: { note } }));
      setNote('');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Modal title={task.title} onClose={onClose}>
      <div className="detail">
        <div className="badges">
          <StatusBadge status={task.status} /> <PriorityBadge priority={task.priority} />
        </div>
        {task.description && <p>{task.description}</p>}
        <dl className="meta">
          <dt>Worker</dt><dd>{task.assignedTo?.name || 'Removed'}</dd>
          <dt>Customer</dt><dd>{task.customerName || '—'}</dd>
          {task.customerPhone && (<><dt>Phone</dt><dd><a href={`tel:+91${task.customerPhone}`}>{formatPhone(task.customerPhone)}</a></dd></>)}
          <dt>Location</dt><dd>{task.location || '—'}</dd>
          <dt>Due</dt><dd>{fmtDate(task.dueDate)}</dd>
          <dt>Created</dt><dd>{fmtDateTime(task.createdAt)}</dd>
          <dt>Completed</dt><dd>{fmtDateTime(task.completedAt)}</dd>
        </dl>

        <label className="inline">
          Status
          <select value={task.status} onChange={(e) => changeStatus(e.target.value)}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>

        <h4>Customer feedback</h4>
        {task.feedback ? (
          <div className="feedback-box">
            <div className="row-between"><Stars value={task.feedback.rating} /><FeedbackSource feedback={task.feedback} /></div>
            {task.feedback.comment && <p className="quote">“{task.feedback.comment}”</p>}
            <div className="muted small">
              {task.feedback.customerName || 'Customer'}
              {task.feedback.source !== 'customer' && task.feedback.submittedBy?.name && ` · recorded by ${task.feedback.submittedBy.name}`}
              {' · '}{fmtDateTime(task.feedback.submittedAt)}
            </div>
          </div>
        ) : (
          <p className="muted">No feedback yet.</p>
        )}
        {task.status === 'completed' && task.feedback?.source !== 'customer' && <ShareFeedbackLink task={task} />}

        <h4>Progress updates</h4>
        <Timeline updates={task.updates} />
        <form onSubmit={addNote} className="note-form">
          <input placeholder="Add a note for the worker…" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn">Add</button>
        </form>

        <div className="actions">
          <button className="btn danger" onClick={onDelete}>Delete</button>
          <div className="spacer" />
          <button className="btn primary" onClick={onEdit}>Edit / reassign</button>
        </div>
      </div>
    </Modal>
  );
}

function WorkerForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const phoneError = form.phone && !isValidPhone(form.phone) ? 'Enter a valid 10-digit mobile number' : '';

  const submit = async (e) => {
    e.preventDefault();
    if (!isValidPhone(form.phone)) return setError('Enter a valid 10-digit mobile number (starting with 6-9)');
    try {
      await api('/users', { method: 'POST', body: form });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal title="Add worker" onClose={onClose}>
      <form onSubmit={submit} className="form">
        {error && <div className="alert">{error}</div>}
        <label>Name<input value={form.name} onChange={set('name')} required /></label>
        <div className="grid2">
          <label>Email (optional)<input type="email" value={form.email} onChange={set('email')} /></label>
          <label>
            Phone
            <input
              type="tel"
              inputMode="tel"
              maxLength={16}
              placeholder="98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d+\s-]/g, '') })}
              className={phoneError ? 'invalid' : ''}
              required
            />
            {phoneError && <span className="field-error">{phoneError}</span>}
          </label>
        </div>
        <label>Password (min 6 characters)
          <input type="password" minLength={6} value={form.password} onChange={set('password')} required />
        </label>
        <p className="muted small">The worker logs in with this phone number and password.</p>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary">Add worker</button>
        </div>
      </form>
    </Modal>
  );
}
