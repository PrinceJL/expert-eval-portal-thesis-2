import React from 'react';
import { Link } from 'react-router-dom';

export default function Maintenance() {
  let msg = 'System is under maintenance. Please try again later.';
  try {
    const saved = sessionStorage.getItem('maintenanceMessage');
    if (saved) msg = saved;
  } catch {}

  return (
    <div className="container" style={{ paddingTop: 60 }}>
      <div className="card" style={{ maxWidth: 680, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>503 — Maintenance</h2>
        <p className="muted">{msg}</p>
        <div className="row" style={{ marginTop: 16, gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn" to="/login">Back to Login</Link>
          <button className="btn btn-ghost" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    </div>
  );
}
