import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import {
  FeedbackSource, Modal, PriorityBadge, ShareFeedbackLink, StatusBadge, Stars, Timeline, STATUS_LABEL, fmtDate,
} from '../components/ui';
import { formatPhone } from '../phone';
import useTaskFromUrl from '../useTaskFromUrl';

export default function WorkerDashboard() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('active');
  const [selected, setSelected] = useState(null);
  const [feedbackFor, setFeedbackFor] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setTasks(await api('/tasks'));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    // A new notification usually means a new/changed task: refresh the list
    window.addEventListener('biligiri:new-notification', load);
    return () => window.removeEventListener('biligiri:new-notification', load);
  }, [load]);

  // Opened from a notification (?task=<id>)
  useTaskFromUrl(setSelected);

  const replace = (t) => {
    setTasks((ts) => ts.map((x) => (x._id === t._id ? t : x)));
    setSelected((s) => (s && s._id === t._id ? t : s));
  };

  const updateStatus = async (task, status) => {
    try {
      const t = await api(`/tasks/${task._id}`, { method: 'PUT', body: { status } });
      replace(t);
      if (status === 'completed' && !t.feedback) setFeedbackFor(t);
    } catch (err) {
      alert(err.message);
    }
  };

  const counts = {
    active: tasks.filter((t) => t.status !== 'completed').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    all: tasks.length,
  };
  const shown = tasks.filter((t) =>
    filter === 'all' ? true : filter === 'completed' ? t.status === 'completed' : t.status !== 'completed'
  );

  return (
    <>
      {error && <div className="alert">{error}</div>}
      <div className="row-between">
        <h2>My tasks</h2>
        <div className="tabs compact">
          {[['active', 'Active'], ['completed', 'Completed'], ['all', 'All']].map(([k, label]) => (
            <button key={k} className={`tab ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>
              {label} ({counts[k]})
            </button>
          ))}
        </div>
      </div>

      <div className="task-grid">
        {shown.map((t) => (
          <div key={t._id} className="card task-card">
            <div className="row-between">
              <PriorityBadge priority={t.priority} />
              <StatusBadge status={t.status} />
            </div>
            <h3 className="clickable" onClick={() => setSelected(t)}>{t.title}</h3>
            {t.description && <p className="muted clamp">{t.description}</p>}
            <div className="small">
              {t.customerName && <div>Customer: {t.customerName}</div>}
              {t.location && <div>Location: {t.location}</div>}
              <div>Due: {fmtDate(t.dueDate)}</div>
            </div>
            <div className="card-actions">
              {t.status === 'pending' && (
                <button className="btn primary small" onClick={() => updateStatus(t, 'in_progress')}>Start work</button>
              )}
              {t.status === 'in_progress' && (
                <button className="btn primary small" onClick={() => updateStatus(t, 'completed')}>Mark complete</button>
              )}
              {t.status === 'completed' && !t.feedback && (
                <button className="btn primary small" onClick={() => setFeedbackFor(t)}>Get feedback</button>
              )}
              {t.feedback && <Stars value={t.feedback.rating} />}
              <button className="btn ghost small" onClick={() => setSelected(t)}>Details</button>
            </div>
          </div>
        ))}
        {!shown.length && <div className="card muted center">No tasks here.</div>}
      </div>

      {selected && (
        <WorkerTaskDetail
          task={selected}
          onClose={() => setSelected(null)}
          onStatus={(s) => updateStatus(selected, s)}
          onChanged={replace}
          onFeedback={() => setFeedbackFor(selected)}
        />
      )}

      {feedbackFor && (
        <FeedbackForm
          task={feedbackFor}
          onClose={() => setFeedbackFor(null)}
          onSaved={(t) => { replace(t); setFeedbackFor(null); }}
        />
      )}
    </>
  );
}

function WorkerTaskDetail({ task, onClose, onStatus, onChanged, onFeedback }) {
  const [note, setNote] = useState('');

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
          <dt>Customer</dt><dd>{task.customerName || '—'}</dd>
          {task.customerPhone && (<><dt>Phone</dt><dd><a href={`tel:+91${task.customerPhone}`}>{formatPhone(task.customerPhone)}</a></dd></>)}
          <dt>Location</dt><dd>{task.location || '—'}</dd>
          <dt>Due</dt><dd>{fmtDate(task.dueDate)}</dd>
          <dt>Assigned by</dt><dd>{task.createdBy?.name || '—'}</dd>
        </dl>

        <label className="inline">
          Status
          <select value={task.status} onChange={(e) => onStatus(e.target.value)}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>

        <h4>Customer feedback</h4>
        {task.feedback ? (
          <div className="feedback-box">
            <div className="row-between"><Stars value={task.feedback.rating} /><FeedbackSource feedback={task.feedback} /></div>
            {task.feedback.comment && <p className="quote">“{task.feedback.comment}”</p>}
            {task.feedback.source !== 'customer' && (
              <button className="btn ghost small" onClick={onFeedback}>Edit feedback</button>
            )}
          </div>
        ) : task.status === 'completed' ? (
          <>
            <ShareFeedbackLink task={task} />
            <button className="btn ghost small record-btn" onClick={onFeedback}>Or record their rating yourself</button>
          </>
        ) : (
          <p className="muted">Available once the task is completed.</p>
        )}

        <h4>Progress updates</h4>
        <Timeline updates={task.updates} />
        <form onSubmit={addNote} className="note-form">
          <input placeholder="Add a progress note…" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn">Add</button>
        </form>
      </div>
    </Modal>
  );
}

function FeedbackForm({ task, onClose, onSaved }) {
  const [manual, setManual] = useState(!!task.feedback);
  const [rating, setRating] = useState(task.feedback?.rating || 0);
  const [hover, setHover] = useState(0);
  const [customerName, setCustomerName] = useState(task.feedback?.customerName || task.customerName || '');
  const [comment, setComment] = useState(task.feedback?.comment || '');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError('Please choose a rating');
    try {
      onSaved(await api(`/tasks/${task._id}/feedback`, { method: 'POST', body: { rating, customerName, comment } }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal title="Get customer feedback" onClose={onClose}>
      {!task.feedback && (
        <div className="form">
          <p className="muted">
            Work on <strong>{task.title}</strong> is done. Send {task.customerName || 'the customer'} the feedback link:
          </p>
          <ShareFeedbackLink task={task} compact />
        </div>
      )}

      {!manual ? (
        <div className="actions">
          <button type="button" className="btn ghost" onClick={() => setManual(true)}>Customer is here? Rate now</button>
          <button type="button" className="btn primary" onClick={onClose}>Done</button>
        </div>
      ) : (
        <form onSubmit={submit} className="form manual-feedback">
          <p className="muted">{task.feedback ? 'Update' : 'Or record'} the customer's rating for <strong>{task.title}</strong>.</p>
          {error && <div className="alert">{error}</div>}
          <div className="star-input" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                className={n <= (hover || rating) ? 'on' : ''}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
          <label>Customer name<input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></label>
          <label>Comments<textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} /></label>
          <div className="actions">
            <button type="button" className="btn ghost" onClick={onClose}>Later</button>
            <button className="btn primary">Save rating</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
