'use client';

import { useAuth } from '../lib/contexts/auth-context';
import ProtectedRoute from '../components/ProtectedRoute';
import Header from '../components/Header';
import TopPreferencesWidget from '../components/TopPreferencesWidget';
import ConnectedAppsWidget from '../components/ConnectedAppsWidget';
import InsightsWidget from '../components/InsightsWidget';
import PreferenceCategoriesGrid from '../components/PreferenceCategoriesGrid';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--background)]">
        {/* Header */}
        <Header />
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="font-heading text-4xl md:text-6xl font-bold text-white mb-4">
              Welcome back{user?.name ? `, ${user.name}` : ''}
            </h1>
            <p className="text-[var(--foreground-muted)] text-lg max-w-2xl mx-auto">
              Your digital identity, perfectly curated and intelligently shared across all your favorite apps.
            </p>
          </div>

          {/* Top Widgets Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <TopPreferencesWidget userId={user?.id || ''} />
            <ConnectedAppsWidget userId={user?.id || ''} />
            <InsightsWidget userId={user?.id || ''} />
          </div>

          {/* Categories Section */}
          <div className="mb-8">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white mb-6">
              Preference Categories
            </h2>
            <PreferenceCategoriesGrid />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
