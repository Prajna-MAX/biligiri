import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import Layout from './components/Layout';

function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
      <Route path="/worker" element={<RequireRole role="worker"><WorkerDashboard /></RequireRole>} />
      <Route
        path="*"
        element={loading ? null : <Navigate to={user ? `/${user.role}` : '/login'} replace />}
      />
    </Routes>
  );
}
