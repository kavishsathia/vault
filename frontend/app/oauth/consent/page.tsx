'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/contexts/auth-context';

interface ScopeInfo {
  scope: string;
  category: string | null;
  access_type: string;
  description: string;
}

interface ConsentInfo {
  client_name: string;
  client_description?: string;
  requested_scopes: ScopeInfo[];
  user_preferences_count: number;
  affected_categories: string[];
}

const SCOPE_ICONS: Record<string, string> = {
  'read': '👀',
  'write': '✏️',
  'query': '🔍'
};

function OAuthConsentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, isAuthenticated, isLoading } = useAuth();
  
  const [consentInfo, setConsentInfo] = useState<ConsentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  // URL parameters
  const responseType = searchParams.get('response_type');
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');

  useEffect(() => {
    const fetchConsentInfo = async () => {
      try {
        // Wait for auth to load
        if (isLoading) return;

        // Check if user is authenticated
        if (!isAuthenticated || !token) {
          // Redirect to login with OAuth parameters
          const currentUrl = encodeURIComponent(window.location.href);
          router.push(`/auth/signin?return_url=${currentUrl}`);
          return;
        }

        // Validate required parameters
        if (!clientId || !redirectUri || !scope) {
          throw new Error('Missing required OAuth parameters');
        }

        // Fetch consent information from backend
        const response = await fetch('/api/oauth/validate-request', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: scope,
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallengeMethod,
            approved: false // This is for validation only
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to load consent information');
        }

        const data = await response.json();
        setConsentInfo(data);
      } catch (err) {
        console.error('Consent screen error:', err);
        setError((err as Error).message || 'Failed to load consent screen');
      } finally {
        setLoading(false);
      }
    };

    fetchConsentInfo();
  }, [clientId, redirectUri, scope, state, codeChallenge, codeChallengeMethod, token, isAuthenticated, isLoading, router]);

  const handleApprove = async () => {
    setSubmitting(true);
    setError('');

    try {
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/oauth/consent', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: scope,
          state: state,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          approved: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Consent failed');
      }

      const { redirect_url } = await response.json();
      window.location.href = redirect_url;
    } catch (err) {
      setError((err as Error).message || 'Failed to process consent');
      setSubmitting(false);
    }
  };

  const handleDeny = () => {
    const errorUrl = `${redirectUri}?error=access_denied&error_description=User+denied+access${state ? `&state=${state}` : ''}`;
    window.location.href = errorUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--purple-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--foreground-light)]">Loading consent form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="bg-[var(--surface)] border border-[var(--surface-light)] rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-[var(--error)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-6 h-6 text-[var(--error)]">⚠</div>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Error</h1>
          <p className="text-[var(--foreground-muted)] mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-[var(--purple-primary)] hover:bg-[var(--purple-light)] text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!consentInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] border border-[var(--surface-light)] rounded-xl p-8 max-w-2xl w-full">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--purple-primary)] to-[var(--purple-light)] rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white rounded-lg"></div>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-white mb-2">
            Authorize Access
          </h1>
          <p className="text-[var(--foreground-muted)]">
            <span className="text-white font-medium">{consentInfo.client_name}</span> wants to access your Vault preferences
          </p>
          {consentInfo.client_description && (
            <p className="text-[var(--foreground-muted)] text-sm mt-2">
              {consentInfo.client_description}
            </p>
          )}
        </div>

        {/* Permissions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Requested Permissions</h3>
          <div className="bg-[var(--surface-dark)] rounded-lg p-4 space-y-4">
            {consentInfo.requested_scopes.map((scopeInfo, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-[var(--purple-primary)]/20 rounded-lg flex items-center justify-center">
                  <span className="text-lg">{SCOPE_ICONS[scopeInfo.access_type] || '🔧'}</span>
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium capitalize">
                    {scopeInfo.access_type} {scopeInfo.category ? `${scopeInfo.category} ` : ''}preferences
                  </div>
                  <div className="text-[var(--foreground-muted)] text-sm">
                    {scopeInfo.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        {consentInfo.user_preferences_count > 0 && (
          <div className="mb-8 bg-[var(--surface-dark)] rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--foreground-light)]">Your stored preferences:</span>
              <span className="text-[var(--purple-primary)] font-medium">{consentInfo.user_preferences_count}</span>
            </div>
            {consentInfo.affected_categories.length > 0 && (
              <div className="mt-2">
                <span className="text-[var(--foreground-muted)] text-sm">
                  Categories: {consentInfo.affected_categories.join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleDeny}
            disabled={submitting}
            className="flex-1 bg-[var(--surface)] border border-[var(--surface-light)] text-[var(--foreground-light)] hover:bg-[var(--surface-light)] disabled:opacity-50 font-medium py-3 rounded-lg transition-colors"
          >
            Deny
          </button>
          <button
            onClick={handleApprove}
            disabled={submitting}
            className="flex-1 bg-[var(--purple-primary)] hover:bg-[var(--purple-light)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
          >
            {submitting ? 'Authorizing...' : 'Allow Access'}
          </button>
        </div>

        {/* Privacy warning */}
        <div className="mt-6 bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-[var(--warning)] text-lg">🔐</div>
            <div className="flex-1">
              <h4 className="text-[var(--warning)] font-medium mb-1">Privacy Seed Required</h4>
              <p className="text-[var(--foreground-muted)] text-sm">
                After authorization, this app will prompt you for your 6-digit privacy seed to decrypt your preferences. 
                Your seed is never shared with the app or our servers.
              </p>
            </div>
          </div>
        </div>

        {/* Security note */}
        <div className="mt-4 text-center">
          <p className="text-[var(--foreground-muted)] text-sm">
            You can revoke this access at any time in your{' '}
            <button 
              onClick={() => router.push('/apps')}
              className="text-[var(--purple-primary)] hover:text-[var(--purple-light)] transition-colors underline"
            >
              connected apps settings
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--purple-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--foreground-light)]">Loading consent form...</p>
        </div>
      </div>
    }>
      <OAuthConsentForm />
    </Suspense>
  );
}