import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { isValidPhone } from '../phone';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={`/${user.role}`} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidPhone(phone)) return setError('Enter a valid 10-digit mobile number');
    setBusy(true);
    try {
      const u = await login(phone, password);
      navigate(`/${u.role}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={submit}>
        <h1 className="brand">Biligiri</h1>
        <p className="muted">Sign in to your dashboard</p>
        {error && <div className="alert">{error}</div>}
        <label>
          Phone number
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={16}
            placeholder="98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
            required
            autoFocus
          />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="btn primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
