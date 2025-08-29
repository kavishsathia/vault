'use client';

import { useHealthCheck } from '../lib/hooks/api';

export default function HealthCheck() {
  const { data, isLoading, error } = useHealthCheck();

  if (isLoading) {
    return (
      <div className="fixed bottom-4 right-4 bg-[var(--surface)] border border-[var(--surface-light)] rounded-lg p-3 flex items-center space-x-2">
        <div className="w-3 h-3 bg-[var(--warning)] rounded-full animate-pulse"></div>
        <span className="text-sm text-[var(--foreground-light)]">Connecting...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 bg-[var(--surface)] border border-[var(--error)] rounded-lg p-3 flex items-center space-x-2">
        <div className="w-3 h-3 bg-[var(--error)] rounded-full"></div>
        <span className="text-sm text-[var(--error)]">API Offline</span>
      </div>
    );
  }

  if (data) {
    return (
      <div className="fixed bottom-4 right-4 bg-[var(--surface)] border border-[var(--success)] rounded-lg p-3 flex items-center space-x-2">
        <div className="w-3 h-3 bg-[var(--success)] rounded-full"></div>
        <span className="text-sm text-[var(--success)]">API Connected</span>
      </div>
    );
  }

  return null;
}