/**
 * Simple fetch wrapper that automatically:
 * - prefixes the backend base URL
 * - attaches Authorization header if token exists
 */

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
}

export async function apiFetch(path, options = {}) {
  const baseUrl = getApiBaseUrl();
  const token = localStorage.getItem('accessToken');

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;

    // Global maintenance handling
    if (res.status === 503) {
      try {
        sessionStorage.setItem('maintenanceMessage', data?.message || msg);
      } catch {}
      if (window.location.pathname !== '/maintenance') {
        window.location.href = '/maintenance';
      }
    }
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
