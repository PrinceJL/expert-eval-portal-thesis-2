import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [group, setGroup] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ username, password, group });
      nav('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'grid', placeItems: 'center', minHeight: 'calc(100vh - 40px)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ marginTop: 0, marginBottom: 6 }}>Expert Portal Login</h1>
        <div className="muted" style={{ marginBottom: 12 }}>
          Enter your credentials (includes <b>group</b>).
        </div>

        {error ? <div className="alert" style={{ marginBottom: 12 }}>{error}</div> : null}

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
          <input
            className="input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />

          <input
            className="input"
            placeholder="Group (e.g. TEAM404)"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          />

          <input
            className="input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>

          <div className="muted" style={{ fontSize: 13 }}>
            Tip: If you don't have a user yet, run the backend seed script.
          </div>
        </form>
      </div>
    </div>
  );
}
