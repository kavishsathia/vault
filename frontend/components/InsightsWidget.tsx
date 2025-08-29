'use client';

import { useAnalytics } from '../lib/hooks/api';

interface InsightsWidgetProps {
  userId: string;
}

export default function InsightsWidget({ userId }: InsightsWidgetProps) {
  const { data: analytics, isLoading, error } = useAnalytics(userId);

  if (isLoading) {
    return (
      <div className="bg-[var(--surface)] rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-[var(--surface-light)] rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-[var(--surface-light)] rounded w-32"></div>
          <div className="h-4 bg-[var(--surface-light)] rounded w-28"></div>
          <div className="h-4 bg-[var(--surface-light)] rounded w-36"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl p-6 hover:bg-[var(--surface-light)] transition-all duration-300 group">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-heading text-lg font-semibold text-white">
          Insights
        </h3>
      </div>

      <div className="space-y-4">
        {/* Most Used */}
        <div>
          <h4 className="text-xs font-medium text-[var(--foreground-muted)] mb-2 uppercase tracking-wide">
            Most Used
          </h4>
          <div className="text-[var(--foreground-light)] font-medium">
            {analytics?.top_used[0]?.category} ({analytics?.top_used[0]?.queries}x)
          </div>
        </div>

        {/* Growing */}
        <div>
          <h4 className="text-xs font-medium text-[var(--foreground-muted)] mb-2 uppercase tracking-wide">
            Growing
          </h4>
          <div className="text-[var(--foreground-light)] font-medium">
            {analytics?.growing[0]?.category} (+{analytics?.growing[0]?.growth}%)
          </div>
        </div>

        {/* Hot Topics */}
        <div>
          <h4 className="text-xs font-medium text-[var(--foreground-muted)] mb-2 uppercase tracking-wide">
            Trending
          </h4>
          <div className="flex flex-wrap gap-1">
            {analytics?.hot_topics.slice(0, 3).map((topic, i) => (
              <span 
                key={i} 
                className="text-xs bg-[var(--surface-light)] text-[var(--foreground-light)] px-2 py-1 rounded-full"
              >
                {topic.replace(/[🌶️🌙🎮☕]/g, '').trim()}
              </span>
            ))}
          </div>
        </div>

        {/* Privacy Health Score */}
        <div className="pt-4 border-t border-[var(--surface-light)]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--foreground-light)]">Privacy Health</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-[var(--success)]">
                {analytics?.privacy_health_score}/100
              </span>
              <div className="w-2 h-2 bg-[var(--success)] rounded-full"></div>
            </div>
          </div>
          <div className="text-xs text-[var(--foreground-muted)] mt-1">
            {analytics?.total_connected_apps} apps • {analytics?.apps_need_review} need review • {analytics?.suspicious_activity} suspicious
          </div>
        </div>
      </div>
    </div>
  );
}