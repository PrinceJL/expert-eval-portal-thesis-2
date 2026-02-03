import React from 'react';
import { useAuth } from '../auth/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Dashboard</h2>
        <p className="muted">Welcome, <b>{user.username}</b>. Your role is <b>{user.role}</b>.</p>
        <p>Put your dashboard widgets here (assigned evaluations, notifications, etc.).</p>
      </div>
    </div>
  );
}
