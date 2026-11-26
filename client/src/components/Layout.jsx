import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { unlinkPush } from '../push';
import NotificationBell from './NotificationBell';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Biligiri</div>
        <div className="topbar-right">
          <span className="who">
            <span className="who-name">{user.name}</span>
            <span className="role">{user.role}</span>
          </span>
          <NotificationBell />
          <button
            className="btn ghost"
            onClick={async () => {
              await unlinkPush(); // stop this device getting the logged-out user's alerts
              logout();
              navigate('/login');
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}
