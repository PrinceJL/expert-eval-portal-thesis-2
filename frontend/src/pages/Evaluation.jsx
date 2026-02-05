import React, { useState } from 'react';
import { apiFetch } from '../lib/api';

export default function Evaluation() {
  const [status, setStatus] = useState('');

  const testProtected = async () => {
    setStatus('Calling /expert/test …');
    try {
      // Change endpoint to any existing /expert route in your backend
      const data = await apiFetch('/expert/test', { method: 'GET' });
      setStatus(`Success: ${JSON.stringify(data)}`);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Evaluation</h2>
        <p className="muted">This page is protected. Your token will be sent automatically.</p>
        <button className="btn btn-ghost" onClick={testProtected}>Test /expert endpoint</button>
        {status ? <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{status}</pre> : null}
      </div>
    </div>
  );
}
