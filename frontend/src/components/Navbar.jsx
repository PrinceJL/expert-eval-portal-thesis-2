import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Navbar() {
  const { isAuthed, user, logout } = useAuth();

  if (!isAuthed) return null;

  const isAdmin = user.role === 'ADMIN' || user.role === 'RESEARCHER';

  const links = [
    { to: '/dashboard', label: 'Dashboard', show: true },
    { to: '/evaluation', label: 'Evaluation', show: true },
    { to: '/messaging', label: 'Messaging', show: true },
    { to: '/contact', label: 'Contact Us', show: true },
    { to: '/admin/users', label: 'User Management', show: isAdmin },
    { to: '/admin/evaluations', label: 'Evaluation Management', show: isAdmin },
    { to: '/admin/maintenance', label: 'Maintenance Management', show: isAdmin }
  ].filter((x) => x.show);

  return (
    <div className="navbar">
      <div className="navbar-inner">
        <div className="nav-left">
          <div className="brand">Eval Portal</div>
          <div className="nav-links">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="row" style={{ alignItems: 'center', gap: 10 }}>
          <span className="badge">{user.username} • {user.role}</span>
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </div>
    </div>
  );
}
