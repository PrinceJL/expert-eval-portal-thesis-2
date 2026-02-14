import React from 'react';
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

export default function App() {
  const { logoutTransitionPhase, loginTransitionPhase } = useAuth();
  const showLogoutTransition = logoutTransitionPhase !== 'idle';
  const showLoginTransition = loginTransitionPhase !== 'idle';
  const location = useLocation();
  const isLoginRoute = location.pathname === '/login';
  const routeTransitionKey = `${location.pathname}${location.search}`;

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
      {!isLoginRoute ? <Navbar /> : null}
      <div key={routeTransitionKey} className="app-route-stage">
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
      </div>
    </>
  );
}

