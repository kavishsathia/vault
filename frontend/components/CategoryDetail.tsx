'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCategories, useTopPreferences } from '../lib/hooks/api';
import { useAuth } from '../lib/contexts/auth-context';

interface Preference {
  id: string;
  text: string;
  strength: number;
  sources: {
    app_name: string;
    added_at: Date | string;
    strength: number;
  }[];
  last_updated: Date | string;
  created_at: Date | string;
}

interface CategoryDetailProps {
  slug: string;
}

function CategoryIcon({ slug, size = 'large' }: { slug: string; size?: 'small' | 'default' | 'large' }) {
  const sizeClasses = {
    small: 'w-6 h-6',
    default: 'w-10 h-10', 
    large: 'w-20 h-20'
  };

  const categoryColors: Record<string, string> = {
    'food': 'bg-orange-500/30 border-orange-500/50',
    'entertainment': 'bg-red-500/30 border-red-500/50',
    'work-productivity': 'bg-cyan-500/30 border-cyan-500/50',
    'ui-ux': 'bg-purple-500/30 border-purple-500/50',
    'gaming': 'bg-emerald-500/30 border-emerald-500/50',
    'social': 'bg-orange-600/30 border-orange-600/50',
    'shopping': 'bg-pink-500/30 border-pink-500/50',
    'health-fitness': 'bg-lime-500/30 border-lime-500/50',
    'travel': 'bg-blue-500/30 border-blue-500/50',
    'learning': 'bg-indigo-500/30 border-indigo-500/50'
  };

  const colorClass = categoryColors[slug] || 'bg-gray-500/30 border-gray-500/50';
  
  return (
    <div className={`${sizeClasses[size]} ${colorClass} border-2 rounded-xl flex items-center justify-center`}>
      <div className="w-1/2 h-1/2 bg-white/80 rounded-lg"></div>
    </div>
  );
}

function StrengthBar({ strength, maxStrength = 10 }: { strength: number; maxStrength?: number }) {
  const percentage = (strength / maxStrength) * 100;
  const filledBars = Math.round(percentage / 10);
  
  return (
    <div className="flex items-center space-x-1">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-all duration-200 ${
            i < filledBars
              ? 'bg-gradient-to-r from-[var(--purple-primary)] to-[var(--purple-light)]'
              : 'bg-[var(--surface)]'
          }`}
        />
      ))}
      <span className="text-xs text-[var(--foreground-muted)] ml-2">
        {strength.toFixed(1)}
      </span>
    </div>
  );
}

function PreferenceCard({ preference }: { preference: Preference }) {
  const [expanded, setExpanded] = useState(false);
  
  const formatTime = (date: Date | string) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    
    if (diff < 86400000) return 'Today';
    if (diff < 172800000) return 'Yesterday'; 
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <div className="bg-[var(--surface)] rounded-xl p-6 hover:bg-[var(--surface-light)] transition-all duration-200 group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 mr-4">
          <p className="text-[var(--foreground-light)] font-medium leading-relaxed mb-3">
            {preference.text}
          </p>
          <StrengthBar strength={preference.strength} />
        </div>
        <div className="text-right">
          <div className="text-xs text-[var(--foreground-muted)] mb-1">
            Updated {formatTime(preference.last_updated)}
          </div>
          <div className="text-xs text-[var(--foreground-muted)]">
            {preference.sources.length} source{preference.sources.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[var(--surface-light)]">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[var(--purple-primary)] hover:text-[var(--purple-light)] transition-colors"
          >
            {expanded ? 'Hide Sources' : 'View Sources'}
          </button>
          <button className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground-light)] transition-colors">
            Edit
          </button>
        </div>
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="w-6 h-6 bg-[var(--surface-light)] hover:bg-[var(--success)] rounded transition-colors flex items-center justify-center">
            <div className="w-3 h-3 border border-[var(--success)] rounded-sm"></div>
          </button>
          <button className="w-6 h-6 bg-[var(--surface-light)] hover:bg-[var(--error)] rounded transition-colors flex items-center justify-center">
            <div className="w-3 h-3 bg-[var(--error)] rounded-sm"></div>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[var(--surface-light)]">
          <h4 className="text-sm font-medium text-[var(--foreground-light)] mb-3">Sources</h4>
          <div className="space-y-2">
            {preference.sources.map((source, index) => (
              <div key={index} className="flex items-center justify-between bg-[var(--surface-light)] rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-[var(--purple-primary)] to-[var(--purple-light)] rounded-md flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {source.app_name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground-light)]">
                      {source.app_name}
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)]">
                      Added {formatTime(source.added_at)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[var(--foreground-light)]">
                    {source.strength.toFixed(1)}
                  </div>
                  <div className="text-xs text-[var(--foreground-muted)]">
                    strength
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryAnalytics({ preferences }: { preferences: Preference[] }) {
  const totalPreferences = preferences.length;
  const avgStrength = preferences.reduce((sum, p) => sum + p.strength, 0) / totalPreferences || 0;
  const strongestPref = preferences.reduce((max, p) => p.strength > max.strength ? p : max, preferences[0] || { strength: 0 });
  const recentlyUpdated = preferences.filter(p => {
    const daysSince = (new Date().getTime() - new Date(p.last_updated).getTime()) / 86400000;
    return daysSince <= 7;
  }).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-[var(--surface)] rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-white mb-1">{totalPreferences}</div>
        <div className="text-sm text-[var(--foreground-muted)]">Total Prefs</div>
      </div>
      <div className="bg-[var(--surface)] rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-white mb-1">{avgStrength.toFixed(1)}</div>
        <div className="text-sm text-[var(--foreground-muted)]">Avg Strength</div>
      </div>
      <div className="bg-[var(--surface)] rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-white mb-1">{strongestPref.strength?.toFixed(1) || '0'}</div>
        <div className="text-sm text-[var(--foreground-muted)]">Strongest</div>
      </div>
      <div className="bg-[var(--surface)] rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-white mb-1">{recentlyUpdated}</div>
        <div className="text-sm text-[var(--foreground-muted)]">Recent</div>
      </div>
    </div>
  );
}

export default function CategoryDetail({ slug }: CategoryDetailProps) {
  const [sortBy, setSortBy] = useState('strength');
  const [searchQuery, setSearchQuery] = useState('');

  const { user } = useAuth();

  // Get category info
  const { data: categories } = useCategories(user?.id);
  const category = categories?.categories.find(cat => cat.slug === slug);

  // Get preferences for this category
  const { data: preferences, isLoading, error } = useTopPreferences(user?.id || '', {
    category: slug,
    limit: 50
  });

  // Filter and sort preferences
  const filteredPreferences = preferences?.preferences.filter(pref =>
    pref.text.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const sortedPreferences = [...filteredPreferences].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'alphabetical':
        return a.text.localeCompare(b.text);
      default: // strength
        return b.strength - a.strength;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-[var(--surface)] rounded-2xl mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-[var(--surface)] rounded-xl"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-[var(--surface)] rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-[var(--surface)] rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 border-2 border-[var(--foreground-muted)] rounded-sm"></div>
        </div>
        <h2 className="font-heading text-2xl font-normal text-white mb-2">Category not found</h2>
        <p className="text-[var(--foreground-muted)] mb-4">The category you're looking for doesn't exist.</p>
        <Link 
          href="/categories"
          className="bg-[var(--purple-primary)] hover:bg-[var(--purple-light)] text-white px-6 py-3 rounded-lg transition-colors inline-block"
        >
          Back to Categories
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-[var(--foreground-muted)]">
        <Link href="/categories" className="hover:text-[var(--foreground-light)] transition-colors">
          Categories
        </Link>
        <span>→</span>
        <span className="text-[var(--foreground-light)]">{category.name}</span>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--surface)] to-[var(--surface-light)] rounded-2xl p-8 border border-[var(--surface-light)]">
        <div className="flex items-start space-x-6">
          <CategoryIcon slug={category.slug} size="large" />
          <div className="flex-1">
            <h1 className="font-heading text-3xl font-normal text-white mb-3">
              {category.name}
            </h1>
            <p className="text-[var(--foreground-muted)] mb-4 text-lg">
              {category.description}
            </p>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[var(--success)] rounded-full"></div>
                <span className="text-sm text-[var(--foreground-light)]">
                  {category.preference_count} preferences
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[var(--purple-primary)] rounded-full"></div>
                <span className="text-sm text-[var(--foreground-light)]">Active</span>
              </div>
            </div>
          </div>
          <button className="bg-[var(--purple-primary)] hover:bg-[var(--purple-light)] text-white px-4 py-2 rounded-lg transition-colors">
            + Add Preference
          </button>
        </div>
      </div>

      {/* Analytics */}
      <CategoryAnalytics preferences={sortedPreferences} />

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search preferences..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--surface-light)] rounded-lg px-4 py-3 pl-10 text-white placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--purple-primary)] transition-colors"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[var(--foreground-muted)] rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-[var(--surface)] border border-[var(--surface-light)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--purple-primary)] transition-colors"
        >
          <option value="strength">Sort by Strength</option>
          <option value="recent">Recently Updated</option>
          <option value="oldest">Oldest First</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
      </div>

      {/* Preferences List */}
      <div className="space-y-4">
        {sortedPreferences.map((preference) => (
          <PreferenceCard key={preference.id} preference={preference} />
        ))}
      </div>

      {/* Empty State */}
      {sortedPreferences.length === 0 && (
        <div className="text-center py-12">
          <CategoryIcon slug={category.slug} size="large" />
          <h3 className="font-heading text-xl font-normal text-white mb-2 mt-4">
            {searchQuery ? 'No matching preferences' : 'No preferences yet'}
          </h3>
          <p className="text-[var(--foreground-muted)] mb-6">
            {searchQuery 
              ? 'Try adjusting your search terms or add a new preference'
              : 'Start building your preference profile for this category'
            }
          </p>
          <button className="bg-[var(--purple-primary)] hover:bg-[var(--purple-light)] text-white px-6 py-3 rounded-lg transition-colors">
            + Add First Preference
          </button>
        </div>
      )}
    </div>
  );
}