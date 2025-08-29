'use client';

import Link from 'next/link';
import { useIntegratedApps } from '../lib/hooks/api';

interface ConnectedAppsWidgetProps {
  userId: string;
}

function AppIcon({ name }: { name: string }) {
  const colors: Record<string, string> = {
    'FoodieApp': 'from-orange-500 to-orange-600',
    'SpotifyAI': 'from-green-500 to-green-600',
    'WorkFlow': 'from-blue-500 to-blue-600',
    'GameRec': 'from-purple-500 to-purple-600',
    'ShopBot': 'from-pink-500 to-pink-600',
    'TravelApp': 'from-cyan-500 to-cyan-600',
    'FitnessTracker': 'from-emerald-500 to-emerald-600',
    'LearningHub': 'from-indigo-500 to-indigo-600'
  };
  
  const colorClass = colors[name] || 'from-gray-500 to-gray-600';
  const initials = name.slice(0, 2).toUpperCase();
  
  return (
    <div className={`w-8 h-8 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center`}>
      <span className="text-white text-xs font-bold">{initials}</span>
    </div>
  );
}

export default function ConnectedAppsWidget({ userId }: ConnectedAppsWidgetProps) {
  const { data: apps, isLoading, error } = useIntegratedApps(userId, {
    limit: 4
  });

  if (isLoading) {
    return (
      <div className="bg-[var(--surface)] rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-[var(--surface-light)] rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[var(--surface-light)] rounded"></div>
              <div className="h-4 bg-[var(--surface-light)] rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl p-6 hover:bg-[var(--surface-light)] transition-all duration-300 group">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-heading text-lg font-semibold text-white">
          Connected Apps
        </h3>
        <span className="text-xs text-[var(--foreground-muted)]">
          {apps?.total_count} total
        </span>
      </div>

      <div className="space-y-4">
        {apps?.apps.slice(0, 4).map((app) => (
          <div key={app.id} className="group/item hover:bg-[var(--surface-light)] -mx-2 px-2 py-2 rounded-lg transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AppIcon name={app.name} />
                <div>
                  <h4 className="text-[var(--foreground-light)] font-medium text-sm">
                    {app.name}
                  </h4>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    {app.preferences_contributed} contributions
                  </p>
                </div>
              </div>
              
              {/* Connection status indicator */}
              <div className="flex items-center space-x-1">
                <div 
                  className={`w-2 h-2 rounded-full ${
                    app.is_active 
                      ? 'bg-[var(--success)] animate-pulse' 
                      : 'bg-[var(--foreground-muted)]'
                  }`}
                />
                <span className="text-xs text-[var(--foreground-muted)]">
                  {app.queries_made} queries
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Link 
        href="/apps"
        className="block w-full mt-4 py-2 text-sm text-[var(--purple-primary)] hover:text-[var(--purple-light)] font-medium transition-colors opacity-0 group-hover:opacity-100 text-center"
      >
        Manage Apps
      </Link>
    </div>
  );
}