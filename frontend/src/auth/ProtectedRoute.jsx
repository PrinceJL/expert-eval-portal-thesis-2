import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ allowRoles, children }) {
  const { isAuthed, user } = useAuth();

  if (!isAuthed) return <Navigate to="/login" replace />;

  if (allowRoles?.length && !allowRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
