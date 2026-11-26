import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import CustomerFeedback from './pages/CustomerFeedback';
import Layout from './components/Layout';

function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  const { search } = useLocation();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}${search}`} replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user, loading } = useAuth();
  const { search } = useLocation();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Customers: no login, opened from the link the worker sends */}
      <Route path="/f/:token" element={<CustomerFeedback />} />
      <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
      <Route path="/worker" element={<RequireRole role="worker"><WorkerDashboard /></RequireRole>} />
      <Route
        path="*"
        // keep ?task=… so tapping a phone notification opens that task
        element={loading ? null : <Navigate to={user ? `/${user.role}${search}` : '/login'} replace />}
      />
    </Routes>
  );
}
