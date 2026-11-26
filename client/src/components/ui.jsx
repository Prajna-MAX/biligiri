import { useEffect, useState } from 'react';

export const STATUS_LABEL = { pending: 'Pending', in_progress: 'In progress', completed: 'Completed' };

export const StatusBadge = ({ status }) => (
  <span className={`badge status-${status}`}>{STATUS_LABEL[status]}</span>
);

export const PriorityBadge = ({ priority }) => (
  <span className={`badge priority-${priority}`}>{priority}</span>
);

export const Stars = ({ value }) => (
  <span className="stars" title={`${value} / 5`}>
    {'★'.repeat(value)}
    <span className="stars-off">{'★'.repeat(5 - value)}</span>
  </span>
);

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '—');

export function Modal({ title, onClose, children }) {
  // Keep the page behind the popup from scrolling (matters most on phones)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Timeline({ updates }) {
  if (!updates?.length) return <p className="muted">No updates yet.</p>;
  return (
    <ul className="timeline">
      {[...updates].reverse().map((u) => (
        <li key={u._id}>
          <div>{u.note}</div>
          <div className="muted small">
            {u.by?.name || 'Unknown'} · {fmtDateTime(u.createdAt)}
          </div>
        </li>
      ))}
    </ul>
  );
}

export const feedbackUrl = (task) => `${window.location.origin}/f/${task.feedbackToken}`;

// Lets a worker/admin send the customer their private feedback link
export function ShareFeedbackLink({ task, compact = false }) {
  const [copied, setCopied] = useState(false);
  if (!task.feedbackToken) return null;
  const url = feedbackUrl(task);
  const greeting = task.customerName ? `Hi ${task.customerName}, ` : 'Hi, ';
  const intro = `${greeting}thank you for choosing Biligiri. Please rate our work on "${task.title}" here:`;
  const text = `${intro} ${url}`;
  const waNumber = task.customerPhone ? `91${task.customerPhone}` : '';
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link:', url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const share = () => navigator.share({ title: 'Rate our work', text: intro, url }).catch(() => {});

  return (
    <div className={`share-link ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="small muted">
          Send the customer this private link. They can rate the work without logging in.
        </div>
      )}
      <div className="share-buttons">
        <a className="btn whatsapp small" href={waHref} target="_blank" rel="noopener noreferrer">
          WhatsApp{task.customerPhone ? '' : '…'}
        </a>
        <button type="button" className="btn small" onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
        {typeof navigator !== 'undefined' && navigator.share && (
          <button type="button" className="btn small" onClick={share}>Share…</button>
        )}
      </div>
    </div>
  );
}

export function FeedbackSource({ feedback }) {
  return feedback.source === 'customer' ? (
    <span className="badge source-customer">From customer</span>
  ) : (
    <span className="badge source-worker">Recorded by worker</span>
  );
}
