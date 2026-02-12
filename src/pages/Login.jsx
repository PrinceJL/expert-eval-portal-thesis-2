import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.58 10.58a2 2 0 102.84 2.84"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.88 5.08A11.02 11.02 0 0112 4.9c6.5 0 10 7.1 10 7.1a19.28 19.28 0 01-3.33 4.16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.12 6.18C3.71 7.86 2 12 2 12s3.5 7.1 10 7.1c1.11 0 2.16-.16 3.15-.44"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Login() {
  const { login, isAuthed } = useAuth();
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
    if (isAuthed) {
      nav('/dashboard', { replace: true });
    }
  }, [isAuthed, nav]);

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
      className={`login-page${showLoginTransition ? ' is-transitioning' : ''}`}
      style={{
        minHeight: '100svh',
        padding: '24px 16px',
        display: 'grid',
        placeItems: 'center',
        background: showLoginTransition
          ? '#050505'
          : 'linear-gradient(180deg, #99d3ff 0%, #ccecff 42%, #e8f6ff 72%, #f7fbff 100%)',
        transition: 'background 320ms ease',
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

      <div className={`login-card-shell${showLoginTransition ? ' is-transitioning-out' : ''}`}>
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
                  paddingRight: 64
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="login-show-password"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
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
