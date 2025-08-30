'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/contexts/auth-context';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    privacySeed: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      await signup(formData.email, formData.password, formData.privacySeed, formData.name || undefined);
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--purple-primary)] to-[var(--purple-light)] rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white rounded-lg"></div>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-white mb-2">
            Create your Vault
          </h1>
          <p className="text-[var(--foreground-muted)]">
            Start managing your preferences securely
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-[var(--error)]/20 border border-[var(--error)]/40 rounded-lg p-4">
              <p className="text-[var(--error)] text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--foreground-light)] mb-2">
              Name (Optional)
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-[var(--surface)] border border-[var(--surface-light)] rounded-lg px-4 py-3 text-white placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--purple-primary)] transition-colors"
              placeholder="Enter your name"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground-light)] mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-[var(--surface)] border border-[var(--surface-light)] rounded-lg px-4 py-3 text-white placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--purple-primary)] transition-colors"
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground-light)] mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-[var(--surface)] border border-[var(--surface-light)] rounded-lg px-4 py-3 text-white placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--purple-primary)] transition-colors"
              placeholder="Create a password (min. 6 characters)"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--foreground-light)] mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full bg-[var(--surface)] border border-[var(--surface-light)] rounded-lg px-4 py-3 text-white placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--purple-primary)] transition-colors"
              placeholder="Confirm your password"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="privacySeed" className="block text-sm font-medium text-[var(--foreground-light)] mb-2">
              Privacy Seed
              <span className="text-xs text-[var(--foreground-muted)] ml-2">
                (6 digits, choose carefully)
              </span>
            </label>
            <input
              id="privacySeed"
              name="privacySeed"
              type="text"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={formData.privacySeed}
              onChange={handleChange}
              className="w-full bg-[var(--surface)] border border-[var(--surface-light)] rounded-lg px-4 py-3 text-white placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--purple-primary)] transition-colors text-center tracking-widest font-mono"
              placeholder="000000"
              disabled={isLoading}
            />
            <p className="text-xs text-[var(--warning)] mt-1">
              ⚠️ CRITICAL: This encrypts your preferences. If lost, your data cannot be recovered.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[var(--purple-primary)] hover:bg-[var(--purple-light)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-[var(--foreground-muted)]">
            Already have an account?{' '}
            <Link 
              href="/auth/signin" 
              className="text-[var(--purple-primary)] hover:text-[var(--purple-light)] transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Features */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center space-x-3 text-sm text-[var(--foreground-muted)]">
            <div className="w-4 h-4 bg-[var(--success)]/30 border border-[var(--success)] rounded-sm flex items-center justify-center">
              <div className="w-2 h-1 bg-[var(--success)] rounded"></div>
            </div>
            <span>End-to-end encrypted preferences</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-[var(--foreground-muted)]">
            <div className="w-4 h-4 bg-[var(--success)]/30 border border-[var(--success)] rounded-sm flex items-center justify-center">
              <div className="w-2 h-1 bg-[var(--success)] rounded"></div>
            </div>
            <span>Universal app integration</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-[var(--foreground-muted)]">
            <div className="w-4 h-4 bg-[var(--success)]/30 border border-[var(--success)] rounded-sm flex items-center justify-center">
              <div className="w-2 h-1 bg-[var(--success)] rounded"></div>
            </div>
            <span>Privacy-first design</span>
          </div>
        </div>
      </div>
    </div>
  );
}