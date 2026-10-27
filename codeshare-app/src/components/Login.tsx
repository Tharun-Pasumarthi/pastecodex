import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { User } from '../types';

interface LoginProps {
  onNavigate: (path: string) => void;
  onLoginSuccess: (user: User) => void;
  saveCodeshareId?: string;
}

export const Login: React.FC<LoginProps> = ({
  onNavigate,
  onLoginSuccess,
  saveCodeshareId,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Real-time field errors
  const emailError = (() => {
    if (!touched.email && !email) return null;
    const trimmed = email.trim();
    if (!trimmed) return 'Email address is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return 'Please enter a valid email (e.g. name@example.com).';
    return null;
  })();

  const passwordError = (() => {
    if (!touched.password && !password) return null;
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return null;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Strict validation
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email format (e.g. name@example.com).');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setIsLoading(true);

    // Fast, responsive login execution
    setTimeout(() => {
      setIsLoading(false);
      setSuccess('Successfully logged in! Restoring session...');

      const user: User = {
        id: 'usr_' + Math.random().toString(36).substr(2, 9),
        name: trimmedEmail.split('@')[0],
        email: trimmedEmail,
        isAnonymous: false,
        isPro: true,
        savedCodeshares: saveCodeshareId ? [saveCodeshareId] : [],
      };

      // Persist user in localStorage so session never expires unexpectedly
      try {
        localStorage.setItem('codeshare_current_user', JSON.stringify(user));
      } catch {
        // ignore
      }

      setTimeout(() => {
        onLoginSuccess(user);
        if (saveCodeshareId) {
          onNavigate(`/${saveCodeshareId}`);
        } else {
          onNavigate('/');
        }
      }, 250);
    }, 150);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Log in to access saved code</h1>
          <p>Enter your account credentials to view and manage your PasteCodex snippets</p>
        </div>

        {saveCodeshareId && (
          <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', color: '#93c5fd', fontSize: '0.825rem', marginBottom: '1.25rem' }}>
            Log in to link and save PasteCodex <strong>{saveCodeshareId}</strong> to your account.
          </div>
        )}

        {error && (
          <div className="alert-box alert-error" id="error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-box alert-success" role="status">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className={`form-control ${emailError ? 'is-invalid' : ''}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              placeholder="you@example.com"
              autoComplete="email"
              style={emailError ? { borderColor: '#ef4444' } : undefined}
            />
            {emailError && (
              <span style={{ color: '#f87171', fontSize: '0.775rem', marginTop: '0.25rem', display: 'block' }}>
                {emailError}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={`form-control ${passwordError ? 'is-invalid' : ''}`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              placeholder="••••••••"
              autoComplete="current-password"
              style={passwordError ? { borderColor: '#ef4444' } : undefined}
            />
            {passwordError && (
              <span style={{ color: '#f87171', fontSize: '0.775rem', marginTop: '0.25rem', display: 'block' }}>
                {passwordError}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ marginTop: '1.25rem', padding: '0.65rem' }}
            disabled={isLoading}
          >
            <span>{isLoading ? 'Verifying...' : 'Log In'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: '0.6rem' }}>
            New to PasteCodex?{' '}
            <a
              href="/register"
              style={{ color: '#60a5fa', fontWeight: 500 }}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(saveCodeshareId ? `/register?saveCodeshare=${saveCodeshareId}` : '/register');
              }}
            >
              Sign up here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
