import React, { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Navbar from './components/Navbar';
import ProtectedRoute from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EvaluationList from './pages/EvaluationList';
import EvaluationPage from './pages/EvaluationPage';
import Messaging from './pages/Messaging';
import Contact from './pages/Contact';

import AdminUsers from './pages/AdminUsers';
import AdminContact from './pages/AdminContact';
import Maintenance from './pages/Maintenance';
import NotFound from './pages/NotFound';

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ForwardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getPageLabel(pathname) {
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname === '/evaluation') return 'Evaluation';
  if (pathname.startsWith('/evaluation/')) return 'Evaluation Details';
  if (pathname === '/messaging') return 'Messaging';
  if (pathname === '/contact') return 'Contact Us';
  if (pathname === '/admin/users') return 'User Management';
  if (pathname === '/admin/contact') return 'Contact Info';
  if (pathname === '/maintenance') return 'Maintenance';
  return 'Portal';
}

export default function App() {
  const { logoutTransitionPhase, loginTransitionPhase, isAuthed, user } = useAuth();
  const APP_BRAND_NAME = 'Evaluation Portal';
  const CRUMB_SWIPE_MS = 180;
  const showLogoutTransition = logoutTransitionPhase !== 'idle';
  const showLoginTransition = loginTransitionPhase !== 'idle';
  const location = useLocation();
  const isLoginRoute = location.pathname === '/login';
  const routeTransitionKey = `${location.pathname}${location.search}`;
  const pageLabel = getPageLabel(location.pathname);
  const [breadcrumbTarget, setBreadcrumbTarget] = useState({
    previous: APP_BRAND_NAME,
    current: pageLabel
  });
  const [breadcrumbDisplay, setBreadcrumbDisplay] = useState({
    previous: APP_BRAND_NAME,
    current: pageLabel
  });
  const [breadcrumbTransition, setBreadcrumbTransition] = useState(null);
  const hasBreadcrumbMountedRef = useRef(false);
  const breadcrumbTimersRef = useRef([]);
  const breadcrumbNavIntentRef = useRef('neutral');
  const breadcrumbIntentResetTimerRef = useRef(null);
  const breadcrumbDisplayRef = useRef({
    previous: APP_BRAND_NAME,
    current: pageLabel
  });

  const runHistoryNavigation = (direction) => {
    breadcrumbNavIntentRef.current = direction;
    if (breadcrumbIntentResetTimerRef.current) {
      window.clearTimeout(breadcrumbIntentResetTimerRef.current);
      breadcrumbIntentResetTimerRef.current = null;
    }
    if (direction === 'back') {
      window.history.back();
    } else {
      window.history.forward();
    }
    breadcrumbIntentResetTimerRef.current = window.setTimeout(() => {
      breadcrumbNavIntentRef.current = 'neutral';
      breadcrumbIntentResetTimerRef.current = null;
    }, 550);
  };

  useEffect(() => {
    breadcrumbDisplayRef.current = breadcrumbDisplay;
  }, [breadcrumbDisplay]);

  useEffect(() => {
    if (!isAuthed || isLoginRoute) return;

    const historyKey = `visitedRouteHistory:${String(user?.id || 'anon')}`;
    let visitedPaths = [];
    try {
      const raw = sessionStorage.getItem(historyKey);
      visitedPaths = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(visitedPaths)) visitedPaths = [];
    } catch {
      visitedPaths = [];
    }

    if (visitedPaths[visitedPaths.length - 1] !== location.pathname) {
      visitedPaths.push(location.pathname);
    }

    if (visitedPaths.length > 25) {
      visitedPaths = visitedPaths.slice(-25);
    }

    const previousPath = visitedPaths.length > 1 ? visitedPaths[visitedPaths.length - 2] : '';
    const previous = previousPath ? getPageLabel(previousPath) : APP_BRAND_NAME;
    setBreadcrumbTarget({
      previous,
      current: getPageLabel(location.pathname)
    });

    try {
      sessionStorage.setItem(historyKey, JSON.stringify(visitedPaths));
    } catch {
      // ignore storage errors
    }
  }, [isAuthed, isLoginRoute, location.pathname, user?.id]);

  useEffect(() => {
    const currentDisplay = breadcrumbDisplayRef.current;
    const isSame =
      currentDisplay.previous === breadcrumbTarget.previous &&
      currentDisplay.current === breadcrumbTarget.current;

    if (!hasBreadcrumbMountedRef.current) {
      hasBreadcrumbMountedRef.current = true;
      setBreadcrumbDisplay(breadcrumbTarget);
      return;
    }
    if (isSame) return;

    const direction = breadcrumbNavIntentRef.current;
    breadcrumbNavIntentRef.current = 'neutral';
    if (breadcrumbIntentResetTimerRef.current) {
      window.clearTimeout(breadcrumbIntentResetTimerRef.current);
      breadcrumbIntentResetTimerRef.current = null;
    }

    breadcrumbTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    breadcrumbTimersRef.current = [];
    const resolvedDirection = direction === 'back' || direction === 'forward' ? direction : 'neutral';
    setBreadcrumbTransition({
      direction: resolvedDirection,
      from: currentDisplay,
      to: breadcrumbTarget
    });

    const settleTimer = window.setTimeout(() => {
      setBreadcrumbDisplay(breadcrumbTarget);
      setBreadcrumbTransition(null);
    }, CRUMB_SWIPE_MS);

    breadcrumbTimersRef.current.push(settleTimer);
  }, [breadcrumbTarget, CRUMB_SWIPE_MS]);

  useEffect(
    () => () => {
      breadcrumbTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      breadcrumbTimersRef.current = [];
      if (breadcrumbIntentResetTimerRef.current) {
        window.clearTimeout(breadcrumbIntentResetTimerRef.current);
        breadcrumbIntentResetTimerRef.current = null;
      }
    },
    []
  );

  const appRoutes = (
    <Routes location={location}>
      <Route path="/login" element={<Login />} />
      <Route path="/maintenance" element={<Maintenance />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowRoles={['EXPERT', 'ADMIN', 'RESEARCHER']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/evaluation"
        element={
          <ProtectedRoute allowRoles={['EXPERT', 'ADMIN', 'RESEARCHER']}>
            <EvaluationList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/evaluation/:id"
        element={
          <ProtectedRoute allowRoles={['EXPERT', 'ADMIN', 'RESEARCHER']}>
            <EvaluationPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/messaging"
        element={
          <ProtectedRoute allowRoles={['EXPERT', 'ADMIN', 'RESEARCHER']}>
            <Messaging />
          </ProtectedRoute>
        }
      />

      <Route
        path="/contact"
        element={
          <ProtectedRoute allowRoles={['EXPERT', 'ADMIN', 'RESEARCHER']}>
            <Contact />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowRoles={['ADMIN', 'RESEARCHER']}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/contact"
        element={
          <ProtectedRoute allowRoles={['ADMIN', 'RESEARCHER']}>
            <AdminContact />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  return (
    <>
      {showLogoutTransition ? (
        <div
          className={`logout-post-splash logout-post-splash-${logoutTransitionPhase}`}
          role="status"
          aria-label="Signing out"
        />
      ) : null}
      {showLoginTransition ? (
        <div
          className={`login-global-splash login-global-splash-${loginTransitionPhase}`}
          role="status"
          aria-label="Signing in"
        >
          <img src="/images/logo-login.webp" alt="Portal logo" className="login-global-splash-logo" />
        </div>
      ) : null}
      {isLoginRoute ? (
        <div key={routeTransitionKey} className="app-route-stage">
          {appRoutes}
        </div>
      ) : (
        <div className={isAuthed ? "app-shell" : undefined}>
          {isAuthed ? <Navbar /> : null}
          <main className={isAuthed ? "app-shell-main" : undefined}>
            {isAuthed ? (
              <header className="app-shell-header">
                <div className="app-shell-header-inner">
                  <div className="app-shell-breadcrumb">
                    <div className="app-shell-history">
                      <button
                        type="button"
                        className="app-shell-history-btn"
                        aria-label="Go back"
                        title="Back"
                        onClick={() => runHistoryNavigation('back')}
                      >
                        <BackIcon />
                      </button>
                      <button
                        type="button"
                        className="app-shell-history-btn"
                        aria-label="Go forward"
                        title="Forward"
                        onClick={() => runHistoryNavigation('forward')}
                      >
                        <ForwardIcon />
                      </button>
                    </div>

                    <div className="app-shell-crumbs-viewport" aria-live="polite">
                      {breadcrumbTransition ? (
                        <>
                          <div className={`app-shell-crumbs-track from dir-${breadcrumbTransition.direction}`}>
                            <span className="app-shell-crumb-root">{breadcrumbTransition.from.previous}</span>
                            <span className="app-shell-crumb-sep" aria-hidden="true">
                              &gt;
                            </span>
                            <span className="app-shell-crumb-page">{breadcrumbTransition.from.current}</span>
                          </div>
                          <div className={`app-shell-crumbs-track to dir-${breadcrumbTransition.direction}`}>
                            <span className="app-shell-crumb-root">{breadcrumbTransition.to.previous}</span>
                            <span className="app-shell-crumb-sep" aria-hidden="true">
                              &gt;
                            </span>
                            <span className="app-shell-crumb-page">{breadcrumbTransition.to.current}</span>
                          </div>
                        </>
                      ) : (
                        <div className="app-shell-crumbs-track static">
                          <span className="app-shell-crumb-root">{breadcrumbDisplay.previous}</span>
                          <span className="app-shell-crumb-sep" aria-hidden="true">
                            &gt;
                          </span>
                          <span className="app-shell-crumb-page">{breadcrumbDisplay.current}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </header>
            ) : null}
            <div key={routeTransitionKey} className="app-route-stage app-shell-route">
              {appRoutes}
            </div>
          </main>
        </div>
      )}
    </>
  );
}

