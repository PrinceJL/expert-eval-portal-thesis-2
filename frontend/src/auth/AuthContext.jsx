import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

const AuthContext = createContext(null);

const IDLE_MINUTES = Number(import.meta.env.VITE_IDLE_MINUTES || 15); // auto-logout after inactivity

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('accessToken'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  const isAuthed = !!token && !!user;

  // === Inactivity logout ===
  const idleTimer = useRef(null);
  const lastActivity = useRef(Date.now());

  function clearIdleTimer() {
    if (idleTimer.current) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }

  function scheduleIdleLogout() {
    clearIdleTimer();
    if (!isAuthed) return;

    idleTimer.current = window.setTimeout(() => {
      // if the timer fires, logout
      logout();
      // eslint-disable-next-line no-alert
      alert('You were logged out due to inactivity.');
    }, IDLE_MINUTES * 60 * 1000);
  }

  function markActivity() {
    lastActivity.current = Date.now();
    scheduleIdleLogout();
  }

  useEffect(() => {
    if (!isAuthed) {
      clearIdleTimer();
      return;
    }

    scheduleIdleLogout();

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    for (const ev of events) window.addEventListener(ev, markActivity, { passive: true });

    return () => {
      for (const ev of events) window.removeEventListener(ev, markActivity);
      clearIdleTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  // === Actions ===
  const login = async ({ username, password }) => {
    const deviceFingerprint = getDeviceFingerprint();

    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, deviceFingerprint })
    });

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));

    setToken(data.accessToken);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');

    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ token, user, isAuthed, login, logout }), [token, user, isAuthed]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

function getDeviceFingerprint() {
  const key = 'deviceFingerprint';
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const fp = cryptoRandomId();
  localStorage.setItem(key, fp);
  return fp;
}

function cryptoRandomId() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
