import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { fmtDate, Stars } from '../components/ui';

const STATUS_TEXT = {
  pending: { label: 'Scheduled', note: 'Your job is scheduled. You can rate it once the work is done.' },
  in_progress: { label: 'Work in progress', note: 'The work is underway. You can rate it once it is done.' },
  completed: { label: 'Completed', note: '' },
};
const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function CustomerFeedback() {
  const { token } = useParams();
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    api(`/public/feedback/${token}`)
      .then((j) => {
        setJob(j);
        setName(j.feedback?.customerName || j.customerName || '');
        if (j.feedback?.source === 'customer') {
          setRating(j.feedback.rating);
          setComment(j.feedback.comment || '');
        }
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError('Please tap a star to rate.');
    setError('');
    setBusy(true);
    try {
      setJob(await api(`/public/feedback/${token}`, { method: 'POST', body: { rating, comment, customerName: name } }));
      setEditing(false);
      setThanks(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!job) {
    return (
      <div className="cf-page">
        <div className="card cf-card center">
          <div className="brand">Biligiri</div>
          {error ? <p className="alert">{error}</p> : <p className="muted">Loading…</p>}
        </div>
      </div>
    );
  }

  const status = STATUS_TEXT[job.status];
  const customerRated = job.feedback?.source === 'customer';
  const showForm = job.status === 'completed' && (!customerRated || editing);

  return (
    <div className="cf-page">
      <div className="card cf-card">
        <div className="brand">Biligiri</div>
        <p className="muted cf-hello">{job.customerName ? `Hi ${job.customerName}, ` : 'Hi, '}here's your job.</p>

        <div className="cf-job">
          <h2>{job.title}</h2>
          <span className={`badge status-${job.status}`}>{status.label}</span>
          <dl className="meta">
            {job.workerName && (<><dt>Technician</dt><dd>{job.workerName}</dd></>)}
            {job.status === 'completed'
              ? (<><dt>Completed</dt><dd>{fmtDate(job.completedAt)}</dd></>)
              : job.dueDate && (<><dt>Scheduled</dt><dd>{fmtDate(job.dueDate)}</dd></>)}
          </dl>
          {status.note && <p className="cf-note">{status.note}</p>}
        </div>

        {thanks && !editing && (
          <div className="cf-thanks">
            <div className="cf-thanks-icon" aria-hidden="true">✓</div>
            <strong>Thank you for your feedback!</strong>
            <span className="muted small">It has been shared with our team.</span>
          </div>
        )}

        {customerRated && !editing && (
          <div className="feedback-box">
            <span className="muted small">Your rating</span>
            <Stars value={job.feedback.rating} />
            {job.feedback.comment && <p className="quote">“{job.feedback.comment}”</p>}
            <button className="btn ghost small" onClick={() => { setEditing(true); setThanks(false); }}>Change my feedback</button>
          </div>
        )}

        {showForm && (
          <form onSubmit={submit} className="form cf-form">
            <h3>How was the work?</h3>
            <div className="star-input cf-stars" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={n <= (hover || rating) ? 'on' : ''}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  aria-pressed={n === rating}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="cf-rating-word">{RATING_WORDS[hover || rating] || 'Tap a star'}</div>
            <label>
              <span>Anything you'd like to tell us? <span className="muted">(optional)</span></span>
              <textarea rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What went well? What could be better?" />
            </label>
            <label>
              <span>Your name <span className="muted">(optional)</span></span>
              <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
            </label>
            {error && <div className="alert">{error}</div>}
            <button className="btn primary cf-submit" disabled={busy}>{busy ? 'Sending…' : 'Submit feedback'}</button>
            {editing && <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>}
          </form>
        )}
      </div>
      <p className="muted small center cf-foot">This page is private to your job. No login needed.</p>
    </div>
  );
}
