import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import Navbar from './components/Navbar';
import ProtectedRoute from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EvaluationList from './pages/EvaluationList';
import EvaluationPage from './pages/EvaluationPage';
import Messaging from './pages/Messaging';
import Contact from './pages/Contact';
import AdminEvaluations from './pages/AdminEvaluations';
import AdminMaintenance from './pages/AdminMaintenance';

import AdminUsers from './pages/AdminUsers';
import AdminContact from './pages/AdminContact';
import Maintenance from './pages/Maintenance';
import NotFound from './pages/NotFound';

export default function App() {
  const { logoutTransitionPhase } = useAuth();
  const showLogoutTransition = logoutTransitionPhase !== 'idle';

  return (
    <>
      {showLogoutTransition ? (
        <div
          className={`logout-post-splash logout-post-splash-${logoutTransitionPhase}`}
          role="status"
          aria-label="Signing out"
        />
      ) : null}
      <Navbar />
      <Routes>
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
          path="/admin/evaluations"
          element={
            <ProtectedRoute allowRoles={['ADMIN', 'RESEARCHER']}>
              <AdminEvaluations />
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
          path="/admin/maintenance"
          element={
            <ProtectedRoute allowRoles={['ADMIN', 'RESEARCHER']}>
              <AdminMaintenance />
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
    </>
  );
}

