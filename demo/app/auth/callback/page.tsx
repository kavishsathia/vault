'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Get the authorization code from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      router.push('/?error=' + encodeURIComponent(error));
      return;
    }

    if (code) {
      // Redirect back to main page with the code
      router.push('/?code=' + encodeURIComponent(code));
    } else {
      // No code, redirect to main page
      router.push('/');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
      <div className="bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Processing Authentication...
        </h1>
        <p className="text-gray-600">
          Please wait while we connect you to Vault.
        </p>
      </div>
    </div>
  );
}