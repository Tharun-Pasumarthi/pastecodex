import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { User } from '../types';

interface RegisterProps {
  onNavigate: (path: string) => void;
  onRegisterSuccess: (user: User) => void;
  saveCodeshareId?: string;
}

export const Register: React.FC<RegisterProps> = ({
  onNavigate,
  onRegisterSuccess,
  saveCodeshareId,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Observable form validation
    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setSuccess('Account created successfully! Redirecting...');
      const user: User = {
        id: 'usr_' + Math.random().toString(36).substr(2, 9),
        name: name.trim(),
        email: email.trim(),
        isAnonymous: false,
        isPro: false,
        savedCodeshares: saveCodeshareId ? [saveCodeshareId] : [],
      };

      try {
        localStorage.setItem('codeshare_current_user', JSON.stringify(user));
      } catch {
        // ignore
      }

      setTimeout(() => {
        onRegisterSuccess(user);
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
          <h1>Sign up to save code</h1>
          <p>Create a free account to permanently save PasteCodex snippets and customize settings</p>
        </div>

        {saveCodeshareId && (
          <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', color: '#93c5fd', fontSize: '0.825rem', marginBottom: '1.25rem' }}>
            🎉 Signing up will automatically save PasteCodex <strong>{saveCodeshareId}</strong> to your new account.
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

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="reg-name">Your full name</label>
            <input
              id="reg-name"
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              autoComplete="name"
            />
          </div>

          <div className="form-field">
            <label htmlFor="reg-email">Email address</label>
            <input
              id="reg-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="form-field">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ marginTop: '1.25rem', padding: '0.65rem' }}
            disabled={isLoading}
          >
            <span>{isLoading ? 'Creating account...' : 'Sign Up'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <p>
            Already have an account?{' '}
            <a
              href="/login"
              style={{ color: '#60a5fa', fontWeight: 500 }}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(saveCodeshareId ? `/login?saveCodeshare=${saveCodeshareId}` : '/login');
              }}
            >
              Log in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
