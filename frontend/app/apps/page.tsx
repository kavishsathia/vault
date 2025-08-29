'use client';

import Header from '../../components/Header';
import AppManager from '../../components/AppManager';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function AppsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--background)]">
        {/* Header */}
        <Header />
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          <AppManager />
        </main>
      </div>
    </ProtectedRoute>
  );
}