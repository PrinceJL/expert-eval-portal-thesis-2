import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, getApiBaseUrl } from '../lib/api';

const AuthContext = createContext(null);

const IDLE_MINUTES = Number(import.meta.env.VITE_IDLE_MINUTES || 15); // auto-logout after inactivity
const LOGOUT_TRANSITION_ENTER_MS = 220;
const LOGOUT_TRANSITION_EXIT_MS = 340;
const LOGIN_TRANSITION_HOLD_MS = Number(import.meta.env.VITE_LOGIN_TRANSITION_HOLD_MS || 1500);
const LOGIN_TRANSITION_FADE_MS = Number(import.meta.env.VITE_LOGIN_TRANSITION_FADE_MS || 420);
const PRESENCE_HEARTBEAT_MS = Number(import.meta.env.VITE_PRESENCE_HEARTBEAT_MS || 45 * 1000);
const PRESENCE_IDLE_MS = Number(import.meta.env.VITE_PRESENCE_IDLE_MS || 5 * 60 * 1000);
const PRESENCE_ACTIVITY_THROTTLE_MS = Number(import.meta.env.VITE_PRESENCE_ACTIVITY_THROTTLE_MS || 12 * 1000);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('accessToken'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [logoutTransitionPhase, setLogoutTransitionPhase] = useState('idle');
  const [loginTransitionPhase, setLoginTransitionPhase] = useState('idle');

  const isAuthed = !!token && !!user;

  // === Inactivity logout ===
  const idleTimer = useRef(null);
  const lastActivity = useRef(Date.now());
  const logoutTransitionTimers = useRef([]);
  const loginTransitionTimers = useRef([]);
  const presenceHeartbeatTimer = useRef(null);
  const lastPresenceActivityAt = useRef(Date.now());
  const lastHeartbeatSentAt = useRef(0);

  function clearLogoutTransitionTimers() {
    for (const timerId of logoutTransitionTimers.current) {
      window.clearTimeout(timerId);
    }
    logoutTransitionTimers.current = [];
  }

  function clearLoginTransitionTimers() {
    for (const timerId of loginTransitionTimers.current) {
      window.clearTimeout(timerId);
    }
    loginTransitionTimers.current = [];
  }

  function clearPresenceHeartbeatTimer() {
    if (presenceHeartbeatTimer.current) {
      window.clearInterval(presenceHeartbeatTimer.current);
      presenceHeartbeatTimer.current = null;
    }
  }

  function clearAuthState() {
    clearPresenceHeartbeatTimer();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');

    setToken(null);
    setUser(null);
  }

  function notifyServerLogout(currentUserId) {
    if (!currentUserId) return;
    const baseUrl = getApiBaseUrl();
    const payload = {
      userId: String(currentUserId),
      deviceFingerprint: getDeviceFingerprint()
    };

    fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {
      // Best-effort only; local logout should still proceed.
    });
  }

  function clearIdleTimer() {
    if (idleTimer.current) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }

  useEffect(() => () => {
    clearLogoutTransitionTimers();
    clearLoginTransitionTimers();
    clearPresenceHeartbeatTimer();
  }, []);

  async function sendPresenceHeartbeat({ force = false } = {}) {
    if (!isAuthed) return;

    const now = Date.now();
    if (!force) {
      if (document.hidden) return;
      if ((now - lastPresenceActivityAt.current) >= PRESENCE_IDLE_MS) return;
      if ((now - lastHeartbeatSentAt.current) < PRESENCE_ACTIVITY_THROTTLE_MS) return;
    }

    // Update timestamp immediately to prevent concurrent calls during the await
    lastHeartbeatSentAt.current = now;

    try {
      const data = await apiFetch('/auth/heartbeat', {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (data?.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        setToken(data.accessToken);
      }
    } catch {
      // Ignore transient heartbeat failures.
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
    const now = Date.now();
    lastActivity.current = now;
    lastPresenceActivityAt.current = now;
    scheduleIdleLogout();
    void sendPresenceHeartbeat();
  }

  useEffect(() => {
    // Listen for API 401s
    const handleLogoutTrace = () => logout();
    window.addEventListener('auth:logout', handleLogoutTrace);

    if (!isAuthed) {
      clearIdleTimer();
      return () => window.removeEventListener('auth:logout', handleLogoutTrace);
    }

    scheduleIdleLogout();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    for (const ev of events) window.addEventListener(ev, markActivity, { passive: true });

    return () => {
      window.removeEventListener('auth:logout', handleLogoutTrace);
      for (const ev of events) window.removeEventListener(ev, markActivity);
      clearIdleTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed) {
      clearPresenceHeartbeatTimer();
      return undefined;
    }

    lastPresenceActivityAt.current = Date.now();
    void sendPresenceHeartbeat({ force: true });

    const onVisibilityOrFocus = () => {
      if (document.hidden) return;
      lastPresenceActivityAt.current = Date.now();
      void sendPresenceHeartbeat({ force: true });
    };

    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);

    presenceHeartbeatTimer.current = window.setInterval(() => {
      void sendPresenceHeartbeat();
    }, PRESENCE_HEARTBEAT_MS);

    return () => {
      clearPresenceHeartbeatTimer();
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
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

  const startLoginTransition = () => {
    clearLoginTransitionTimers();
    setLoginTransitionPhase('in');

    const toOut = window.setTimeout(() => {
      setLoginTransitionPhase('out');
    }, LOGIN_TRANSITION_HOLD_MS);

    const toIdle = window.setTimeout(() => {
      setLoginTransitionPhase('idle');
    }, LOGIN_TRANSITION_HOLD_MS + LOGIN_TRANSITION_FADE_MS);

    loginTransitionTimers.current.push(toOut, toIdle);
  };

  const setPresenceStatus = async (status) => {
    if (!isAuthed) return;
    const data = await apiFetch('/auth/presence', {
      method: 'POST',
      body: JSON.stringify({ status })
    });
    const nextStatus = data?.status || status;
    setUser((prev) => {
      if (!prev) return prev;
      const nextUser = { ...prev, presenceStatus: nextStatus };
      localStorage.setItem('user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const logout = ({ withTransition = false } = {}) => {
    clearLoginTransitionTimers();
    setLoginTransitionPhase('idle');
    notifyServerLogout(user?.id);

    if (!withTransition) {
      clearLogoutTransitionTimers();
      setLogoutTransitionPhase('idle');
      clearAuthState();
      return;
    }

    clearLogoutTransitionTimers();
    setLogoutTransitionPhase('in');

    const transitionToLoginTimer = window.setTimeout(() => {
      clearAuthState();
      setLogoutTransitionPhase('out');
    }, LOGOUT_TRANSITION_ENTER_MS);

    const finishTransitionTimer = window.setTimeout(() => {
      setLogoutTransitionPhase('idle');
    }, LOGOUT_TRANSITION_ENTER_MS + LOGOUT_TRANSITION_EXIT_MS);

    logoutTransitionTimers.current.push(transitionToLoginTimer, finishTransitionTimer);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthed,
      login,
      logout,
      setPresenceStatus,
      logoutTransitionPhase,
      loginTransitionPhase,
      startLoginTransition
    }),
    [token, user, isAuthed, logoutTransitionPhase, loginTransitionPhase]
  );

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
