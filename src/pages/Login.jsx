import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loginLogo = '/images/logo-login.png';
  const LOGIN_SPLASH_MS = 1700;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoginTransition, setShowLoginTransition] = useState(false);
  const redirectTimerRef = useRef(null);

  useEffect(() => () => {
    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!error) return undefined;
    const timer = window.setTimeout(() => {
      setError('');
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [error]);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!identifier.trim() || !password) {
      setError('Please enter your username/email and password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login({ username: identifier.trim(), password });
      setShowLoginTransition(true);
      redirectTimerRef.current = window.setTimeout(() => {
        nav('/dashboard', { replace: true });
      }, LOGIN_SPLASH_MS);
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-page"
      style={{
        minHeight: '100svh',
        padding: '24px 16px',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(180deg, #99d3ff 0%, #ccecff 42%, #e8f6ff 72%, #f7fbff 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div className="login-bg-motion" aria-hidden="true" />
      {showLoginTransition ? (
        <div
          className="login-post-splash"
          role="status"
          aria-label="Signing in"
          style={{ '--login-splash-ms': `${LOGIN_SPLASH_MS}ms` }}
        >
          <img src={loginLogo} alt="Portal logo" className="login-post-splash-logo" />
        </div>
      ) : null}

      <div className="login-card-shell">
        <div className="login-logo-behind">
          <div
            className="login-logo-animated"
            role="img"
            aria-label="Login logo"
            style={{ '--login-logo-url': `url("${loginLogo}")` }}
          />
          <img
            src={loginLogo}
            alt="Login logo"
            className="login-logo-fallback"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        <div
          className="card login-card"
        >
          <h2
            className="login-title"
            style={{ margin: 0, textAlign: 'center', color: '#1f2937', fontWeight: 700 }}
          >
            Welcome back
          </h2>
          <div className="login-subtitle" style={{ marginTop: 6, textAlign: 'center', color: '#6b7280' }}>
            Sign in with your assigned portal account.
          </div>

          {error ? <div className="login-error" style={{ marginTop: 14 }}>{error}</div> : null}

          <form onSubmit={onSubmit} className="login-form" style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            <input
              className="input login-input"
              placeholder="Email address or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              autoFocus
            />

            <div className="login-password-wrap">
              <input
                className="input login-input"
                placeholder="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  paddingRight: 78
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="login-show-password"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button
              className="btn btn-primary login-submit"
              type="submit"
              disabled={loading || showLoginTransition}
            >
              {loading ? 'Signing in...' : 'Get Started'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
