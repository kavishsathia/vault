'use client';

import { useState } from 'react';
import { apiClient } from '../lib/api/client';

export default function SeedCategories() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    
    try {
      const response = await apiClient.seedCategories();
      setMessage(`Success! Created categories: ${response.created_categories?.join(', ') || 'None (already existed)'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed categories');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-[var(--surface)] border border-[var(--surface-light)] rounded-lg p-4 max-w-sm">
      <h3 className="font-heading text-sm font-normal text-white mb-3">
        Database Setup
      </h3>
      
      <button
        onClick={handleSeed}
        disabled={loading}
        className="w-full bg-[var(--purple-primary)] hover:bg-[var(--purple-light)] disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors text-sm mb-2"
      >
        {loading ? 'Seeding...' : 'Seed Categories'}
      </button>
      
      {message && (
        <div className="text-xs text-[var(--success)] bg-[var(--success)]/10 p-2 rounded">
          {message}
        </div>
      )}
      
      {error && (
        <div className="text-xs text-[var(--error)] bg-[var(--error)]/10 p-2 rounded">
          {error}
        </div>
      )}
      
      <p className="text-xs text-[var(--foreground-muted)] mt-2">
        Run this first if categories page is empty
      </p>
    </div>
  );
}