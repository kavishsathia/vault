'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/contexts/auth-context';

function OAuthAuthorizeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // OAuth parameters from URL
  const responseType = searchParams.get('response_type');
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');

  useEffect(() => {
    const handleOAuthFlow = async () => {
      try {
        // Wait for auth to load
        if (isLoading) {
          return;
        }

        // Validate OAuth parameters
        if (!responseType || responseType !== 'code') {
          throw new Error('Invalid response_type. Only "code" is supported.');
        }

        if (!clientId || !redirectUri || !scope) {
          throw new Error('Missing required OAuth parameters');
        }

        // Check if user is authenticated
        if (!isAuthenticated) {
          // User is not authenticated, redirect to login with return URL
          const currentUrl = encodeURIComponent(window.location.href);
          router.push(`/auth/signin?return_url=${currentUrl}`);
          return;
        }

        // User is authenticated, redirect to consent page
        const consentParams = new URLSearchParams({
          response_type: responseType,
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: scope,
          ...(state && { state }),
          ...(codeChallenge && { code_challenge: codeChallenge }),
          ...(codeChallengeMethod && { code_challenge_method: codeChallengeMethod })
        });

        router.push(`/oauth/consent?${consentParams.toString()}`);

      } catch (err) {
        const errorMessage = (err as Error).message;
        setError(errorMessage);
        
        // If we have a redirect_uri, send error there
        if (redirectUri) {
          const errorUrl = new URL(redirectUri);
          errorUrl.searchParams.set('error', 'invalid_request');
          errorUrl.searchParams.set('error_description', errorMessage);
          if (state) errorUrl.searchParams.set('state', state);
          
          setTimeout(() => {
            window.location.href = errorUrl.toString();
          }, 3000);
        }
      } finally {
        setLoading(false);
      }
    };

    handleOAuthFlow();
  }, [responseType, clientId, redirectUri, scope, state, codeChallenge, codeChallengeMethod, router, isAuthenticated, isLoading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--purple-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--foreground-light)]">Validating OAuth request...</p>
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
          <h1 className="text-xl font-semibold text-white mb-2">OAuth Error</h1>
          <p className="text-[var(--foreground-muted)] mb-6">{error}</p>
          
          {redirectUri && (
            <p className="text-[var(--foreground-muted)] text-sm">
              Redirecting back to application in 3 seconds...
            </p>
          )}
          
          {!redirectUri && (
            <button
              onClick={() => router.push('/')}
              className="bg-[var(--purple-primary)] hover:bg-[var(--purple-light)] text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Return Home
            </button>
          )}
        </div>
      </div>
    );
  }

  // This should not render as we redirect to consent or login
  return null;
}

export default function OAuthAuthorizePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--purple-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--foreground-light)]">Loading OAuth...</p>
        </div>
      </div>
    }>
      <OAuthAuthorizeForm />
    </Suspense>
  );
}