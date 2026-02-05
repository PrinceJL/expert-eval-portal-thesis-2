import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>404 — Page not found</h2>
        <p className="muted">The page you requested doesn’t exist.</p>
        <Link className="btn btn-primary" to="/dashboard">Go to Dashboard</Link>
      </div>
    </div>
  );
}
