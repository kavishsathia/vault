'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/contexts/auth-context';

export default function SignInPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    privacySeed: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signin, isAuthenticated } = useAuth();
  
  const returnUrl = searchParams.get('return_url');

  // If user is already authenticated and there's a return URL, redirect there
  useEffect(() => {
    if (isAuthenticated && returnUrl) {
      try {
        const decodedUrl = decodeURIComponent(returnUrl);
        window.location.href = decodedUrl;
      } catch {
        router.push('/');
      }
    }
  }, [isAuthenticated, returnUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signin(formData.email, formData.password, formData.privacySeed);
      
      // After successful signin, redirect to return URL if present
      if (returnUrl) {
        try {
          const decodedUrl = decodeURIComponent(returnUrl);
          window.location.href = decodedUrl;
          return;
        } catch {
          // If return URL is invalid, fall back to default behavior
        }
      }
      // Default redirect is handled by auth context
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please check your credentials.');
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
            Welcome back to Vault
          </h1>
          <p className="text-[var(--foreground-muted)]">
            Sign in to access your preference manager
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
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-[var(--surface)] border border-[var(--surface-light)] rounded-lg px-4 py-3 text-white placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--purple-primary)] transition-colors"
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="privacySeed" className="block text-sm font-medium text-[var(--foreground-light)] mb-2">
              Privacy Seed
              <span className="text-xs text-[var(--foreground-muted)] ml-2">
                (6 digits, never stored on servers)
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
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              This seed encrypts your preferences. If you forget it, your data is permanently lost.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[var(--purple-primary)] hover:bg-[var(--purple-light)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-[var(--foreground-muted)]">
            Don't have an account?{' '}
            <Link 
              href="/auth/signup" 
              className="text-[var(--purple-primary)] hover:text-[var(--purple-light)] transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}