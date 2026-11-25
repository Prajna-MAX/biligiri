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
