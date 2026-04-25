import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

export default function ForceChangePassword() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user && !user.mustChangePassword) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword: password })
      });

      // Update local user object
      const updatedUser = { ...user, mustChangePassword: false };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Redirect to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Just force a logout event
    window.dispatchEvent(new Event('auth:logout'));
  };

  return (
    <div className="min-h-screen w-full bg-base-200 flex flex-col items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
        <div className="card-body">
          <div className="text-center mb-4">
            <h2 className="card-title text-2xl font-bold justify-center text-primary">Change Password</h2>
            <p className="text-sm opacity-70 mt-2">
              For security reasons, you must change your temporary password before accessing the portal.
            </p>
          </div>

          {error && (
            <div className="alert alert-error shadow-sm py-2 px-3 text-sm mb-4">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text font-medium">New Password</span></label>
              <input
                type="password"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Confirm Password</span></label>
              <input
                type="password"
                className="input input-bordered w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-4"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? (
                <>
                  <span className="modern-loader modern-loader-xs" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>

          <div className="divider opacity-50 my-2">OR</div>

          <button
            type="button"
            className="btn btn-ghost w-full"
            onClick={handleLogout}
            disabled={loading}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
