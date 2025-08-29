'use client';

import Header from '../../components/Header';
import CategoriesManager from '../../components/CategoriesManager';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function CategoriesPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--background)]">
        {/* Header */}
        <Header />
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          <CategoriesManager />
        </main>
      </div>
    </ProtectedRoute>
  );
}