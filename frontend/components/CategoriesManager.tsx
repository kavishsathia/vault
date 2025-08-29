'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCategories } from '../lib/hooks/api';
import { useAuth } from '../lib/contexts/auth-context';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  preference_count: number;
}

function CategoryIcon({ slug, size = 'default' }: { slug: string; size?: 'small' | 'default' | 'large' }) {
  const sizeClasses = {
    small: 'w-6 h-6',
    default: 'w-10 h-10',
    large: 'w-16 h-16'
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

  const shape = categoryShapes[slug] || { shape: 'square', bgClass: 'bg-gray-500/30' };
  
  return (
    <div className={`${sizeClasses[size]} ${shape.bgClass} rounded-lg flex items-center justify-center`}>
      <div className="w-1/2 h-1/2 bg-white/60 rounded-sm"></div>
    </div>
  );
}

function CategoryCard({ category, onClick }: { category: Category; onClick: (category: Category) => void }) {
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

  const colorClass = categoryColors[category.slug] || 'from-gray-500/20 to-gray-600/10 border-gray-500/20';

  return (
    <div 
      onClick={() => onClick(category)}
      className={`
        bg-gradient-to-br ${colorClass} 
        border rounded-2xl p-6 hover:scale-105 hover:shadow-lg 
        transition-all duration-300 cursor-pointer group
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <CategoryIcon slug={category.slug} />
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {category.preference_count || 0}
          </div>
          <div className="text-xs text-[var(--foreground-muted)]">
            preferences
          </div>
        </div>
      </div>
      
      <h3 className="font-heading text-lg font-normal text-white mb-2 group-hover:text-[var(--purple-light)] transition-colors">
        {category.name}
      </h3>
      
      <p className="text-sm text-[var(--foreground-muted)] leading-relaxed line-clamp-2">
        {category.description}
      </p>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center space-x-2 text-xs text-[var(--foreground-muted)]">
          <div className="w-2 h-2 bg-[var(--success)] rounded-full"></div>
          <span>Active</span>
        </div>
        <button className="text-xs text-[var(--purple-primary)] hover:text-[var(--purple-light)] opacity-0 group-hover:opacity-100 transition-opacity">
          View Details →
        </button>
      </div>
    </div>
  );
}

function CategoryStats({ categories }: { categories: Category[] }) {
  const totalPreferences = categories.reduce((sum, cat) => sum + (cat.preference_count || 0), 0);
  const mostActiveCategory = categories.reduce((max, cat) => 
    (cat.preference_count || 0) > (max.preference_count || 0) ? cat : max, 
    categories[0] || { preference_count: 0, name: 'None' }
  );
  const avgPrefsPerCategory = categories.length > 0 ? Math.round(totalPreferences / categories.length) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-[var(--surface)] rounded-xl p-4">
        <div className="text-2xl font-bold text-white mb-1">{categories.length}</div>
        <div className="text-sm text-[var(--foreground-muted)]">Total Categories</div>
      </div>
      <div className="bg-[var(--surface)] rounded-xl p-4">
        <div className="text-2xl font-bold text-white mb-1">{totalPreferences}</div>
        <div className="text-sm text-[var(--foreground-muted)]">Total Preferences</div>
      </div>
      <div className="bg-[var(--surface)] rounded-xl p-4">
        <div className="text-2xl font-bold text-white mb-1">{avgPrefsPerCategory}</div>
        <div className="text-sm text-[var(--foreground-muted)]">Avg per Category</div>
      </div>
      <div className="bg-[var(--surface)] rounded-xl p-4">
        <div className="text-lg font-bold text-white mb-1 truncate">{mostActiveCategory.name}</div>
        <div className="text-sm text-[var(--foreground-muted)]">Most Active</div>
      </div>
    </div>
  );
}

function SearchAndFilters({ 
  searchQuery, 
  setSearchQuery, 
  sortBy, 
  setSortBy 
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      {/* Search */}
      <div className="flex-1">
        <div className="relative">
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--surface)] border border-[var(--surface-light)] rounded-lg px-4 py-3 pl-10 text-white placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--purple-primary)] transition-colors"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[var(--foreground-muted)] rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Sort Dropdown */}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="bg-[var(--surface)] border border-[var(--surface-light)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--purple-primary)] transition-colors"
      >
        <option value="name">Sort by Name</option>
        <option value="count">Sort by Count</option>
        <option value="recent">Recently Updated</option>
      </select>

      {/* Add Category Button */}
      <button className="bg-[var(--purple-primary)] hover:bg-[var(--purple-light)] text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
        <span>Add Category</span>
      </button>
    </div>
  );
}

export default function CategoriesManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const { user } = useAuth();
  const { data: categories, isLoading, error } = useCategories(user?.id);

  const handleCategoryClick = (category: Category) => {
    // Navigate to category detail page
    window.location.href = `/categories/${category.slug}`;
  };

  // Filter and sort categories
  const filteredCategories = categories?.categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    switch (sortBy) {
      case 'count':
        return (b.preference_count || 0) - (a.preference_count || 0);
      case 'recent':
        return a.name.localeCompare(b.name); // Mock sort by recent
      default:
        return a.name.localeCompare(b.name);
    }
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-[var(--error)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 border-2 border-[var(--error)] rounded-sm"></div>
        </div>
        <h3 className="font-heading text-lg font-normal text-white mb-2">
          Connection Error
        </h3>
        <p className="text-[var(--foreground-muted)] mb-4">
          Unable to connect to the backend API. Make sure the server is running at {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-[var(--purple-primary)] hover:bg-[var(--purple-light)] text-white px-6 py-3 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading Header */}
        <div className="bg-gradient-to-br from-[var(--surface)] to-[var(--surface-light)] rounded-2xl p-8 border border-[var(--surface-light)] animate-pulse">
          <div className="h-8 bg-[var(--surface-light)] rounded mb-4 w-1/2"></div>
          <div className="h-4 bg-[var(--surface-light)] rounded w-1/3"></div>
        </div>

        {/* Loading Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[var(--surface)] rounded-xl p-4 animate-pulse">
              <div className="h-8 bg-[var(--surface-light)] rounded mb-2"></div>
              <div className="h-4 bg-[var(--surface-light)] rounded w-2/3"></div>
            </div>
          ))}
        </div>

        {/* Loading Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[var(--surface)] rounded-2xl p-6 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-[var(--surface-light)] rounded-lg"></div>
                <div className="text-right">
                  <div className="h-8 bg-[var(--surface-light)] rounded w-12 mb-1"></div>
                  <div className="h-3 bg-[var(--surface-light)] rounded w-16"></div>
                </div>
              </div>
              <div className="h-5 bg-[var(--surface-light)] rounded mb-2"></div>
              <div className="h-4 bg-[var(--surface-light)] rounded w-4/5"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--surface)] to-[var(--surface-light)] rounded-2xl p-8 border border-[var(--surface-light)]">
        <h1 className="font-heading text-3xl font-normal text-white mb-3">
          Preference Categories
        </h1>
        <p className="text-[var(--foreground-muted)] mb-4">
          Organize and manage your preferences across different areas of your digital life
        </p>
      </div>

      {/* Stats */}
      <CategoryStats categories={sortedCategories} />

      {/* Search and Filters */}
      <SearchAndFilters 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCategories.map((category) => (
          <CategoryCard 
            key={category.id} 
            category={category} 
            onClick={handleCategoryClick}
          />
        ))}
      </div>

      {/* Empty State */}
      {sortedCategories.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-[var(--surface)] rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-[var(--foreground-muted)] rounded-sm"></div>
          </div>
          <h3 className="font-heading text-lg font-normal text-white mb-2">
            No categories found
          </h3>
          <p className="text-[var(--foreground-muted)] mb-4">
            {searchQuery ? 'Try adjusting your search terms' : 'Create your first category to get started'}
          </p>
          <button className="bg-[var(--purple-primary)] hover:bg-[var(--purple-light)] text-white px-6 py-3 rounded-lg transition-colors">
            {searchQuery ? 'Clear Search' : 'Add Category'}
          </button>
        </div>
      )}
    </div>
  );
}