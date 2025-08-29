'use client';

import { useCategories } from '../lib/hooks/api';
import { useAuth } from '../lib/contexts/auth-context';

function CategoryCard({ category }: { category: any }) {
  const categoryColors: Record<string, string> = {
    'food': 'from-orange-500/20 to-orange-600/10 border-orange-500/20',
    'entertainment': 'from-red-500/20 to-red-600/10 border-red-500/20',
    'work-productivity': 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/20',
    'ui-ux': 'from-purple-500/20 to-purple-600/10 border-purple-500/20',
    'gaming': 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20',
    'social': 'from-orange-600/20 to-orange-700/10 border-orange-600/20',
    'shopping': 'from-pink-500/20 to-pink-600/10 border-pink-500/20',
    'health-fitness': 'from-lime-500/20 to-lime-600/10 border-lime-500/20',
    'travel': 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
    'learning': 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/20'
  };

  const categoryShapes: Record<string, { shape: string; bgClass: string }> = {
    'food': { shape: 'circle', bgClass: 'bg-orange-500/30' },
    'entertainment': { shape: 'triangle', bgClass: 'bg-red-500/30' },
    'work-productivity': { shape: 'square', bgClass: 'bg-cyan-500/30' },
    'ui-ux': { shape: 'hexagon', bgClass: 'bg-purple-500/30' },
    'gaming': { shape: 'diamond', bgClass: 'bg-emerald-500/30' },
    'social': { shape: 'star', bgClass: 'bg-orange-600/30' },
    'shopping': { shape: 'heart', bgClass: 'bg-pink-500/30' },
    'health-fitness': { shape: 'plus', bgClass: 'bg-lime-500/30' },
    'travel': { shape: 'arrow', bgClass: 'bg-blue-500/30' },
    'learning': { shape: 'book', bgClass: 'bg-indigo-500/30' }
  };

  const colorClass = categoryColors[category.slug] || 'from-gray-500/20 to-gray-600/10 border-gray-500/20';
  const shape = categoryShapes[category.slug] || { shape: 'square', bgClass: 'bg-gray-500/30' };

  return (
    <div 
      className={`
        bg-gradient-to-br ${colorClass} 
        border rounded-2xl p-6 hover:scale-105 hover:shadow-lg 
        transition-all duration-300 cursor-pointer group
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-8 h-8 ${shape.bgClass} rounded-lg flex items-center justify-center`}>
          <div className="w-3 h-3 bg-white/60 rounded-sm"></div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {category.preference_count || 0}
          </div>
          <div className="text-xs text-[var(--foreground-muted)]">
            preferences
          </div>
        </div>
      </div>
      
      <h3 className="font-heading text-lg font-semibold text-white mb-2 group-hover:text-[var(--purple-light)] transition-colors">
        {category.name}
      </h3>
      
      <p className="text-sm text-[var(--foreground-muted)] leading-relaxed line-clamp-2">
        {category.description}
      </p>
    </div>
  );
}

export default function PreferenceCategoriesGrid() {
  const { user } = useAuth();
  const { data: categories, isLoading, error } = useCategories(user?.id);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="bg-[var(--surface)] rounded-2xl p-6 animate-pulse">
            <div className="w-8 h-8 bg-[var(--surface-light)] rounded mb-4"></div>
            <div className="h-5 bg-[var(--surface-light)] rounded mb-2"></div>
            <div className="h-3 bg-[var(--surface-light)] rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {categories?.categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}