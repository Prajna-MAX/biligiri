import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { enablePush, pushStatus, refreshPushSubscription } from '../push';

const POLL_MS = 30000;

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(date).toLocaleDateString();
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });
  const [push, setPush] = useState('unsupported');
  const [pushMsg, setPushMsg] = useState('');
  const ref = useRef(null);

  const lastUnread = useRef(null);
  const load = useCallback(() => {
    api('/notifications')
      .then((d) => {
        // Let dashboards refresh their lists when something new arrives
        if (lastUnread.current !== null && d.unread > lastUnread.current) {
          window.dispatchEvent(new Event('biligiri:new-notification'));
        }
        lastUnread.current = d.unread;
        setData(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    pushStatus().then(setPush);
    refreshPushSubscription();
    const id = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  // Close when tapping outside
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Show the newest count in the browser tab title
  useEffect(() => {
    document.title = data.unread ? `(${data.unread}) Biligiri` : 'Biligiri';
  }, [data.unread]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) {
      lastUnread.current = Math.max(0, (lastUnread.current || 1) - 1);
      setData((d) => ({ unread: Math.max(0, d.unread - 1), items: d.items.map((x) => (x._id === n._id ? { ...x, read: true } : x)) }));
      api(`/notifications/${n._id}/read`, { method: 'POST' }).catch(() => {});
    }
    if (n.task) navigate(`/${user.role}?task=${n.task}`);
  };

  const readAll = async () => {
    lastUnread.current = 0;
    setData((d) => ({ unread: 0, items: d.items.map((x) => ({ ...x, read: true })) }));
    api('/notifications/read-all', { method: 'POST' }).catch(() => {});
  };

  const turnOnPush = async () => {
    setPushMsg('');
    try {
      await enablePush();
      setPush('enabled');
      setPushMsg('Done! You will get alerts on this device.');
    } catch (err) {
      setPush(await pushStatus());
      setPushMsg(err.message);
    }
  };

  return (
    <div className="bell" ref={ref}>
      <button
        className="btn ghost bell-btn"
        onClick={() => { setOpen(!open); if (!open) load(); }}
        aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ''}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {data.unread > 0 && <span className="bell-count">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>

      {open && (
        <div className="bell-panel" role="dialog" aria-label="Notifications">
          <div className="bell-head">
            <strong>Notifications</strong>
            {data.unread > 0 && <button className="link-btn" onClick={readAll}>Mark all read</button>}
          </div>

          {push === 'available' && (
            <div className="push-cta">
              <div>Get an alert on this {/Mobi/i.test(navigator.userAgent) ? 'phone' : 'device'} when {user.role === 'worker' ? 'a task is assigned to you' : 'tasks are completed or rated'}.</div>
              <button className="btn primary small" onClick={turnOnPush}>Turn on alerts</button>
            </div>
          )}
          {push === 'ios-needs-install' && (
            <div className="push-cta muted small">
              To get alerts on iPhone: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>, then open Biligiri from the home screen and turn on alerts here.
            </div>
          )}
          {push === 'denied' && (
            <div className="push-cta muted small">Alerts are blocked for this site. Allow notifications in your browser settings to turn them on.</div>
          )}
          {pushMsg && <div className="push-msg small">{pushMsg}</div>}

          <ul className="bell-list">
            {data.items.map((n) => (
              <li key={n._id}>
                <button className={`bell-item ${n.read ? '' : 'unread'}`} onClick={() => openItem(n)}>
                  <span className="bell-title">{n.title}</span>
                  {n.body && <span className="bell-body">{n.body}</span>}
                  <span className="bell-time">{timeAgo(n.createdAt)}</span>
                </button>
              </li>
            ))}
            {!data.items.length && <li className="muted center bell-empty">No notifications yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
