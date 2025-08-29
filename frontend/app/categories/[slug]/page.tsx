'use client';

import { useParams } from 'next/navigation';
import Header from '../../../components/Header';
import CategoryDetail from '../../../components/CategoryDetail';
import ProtectedRoute from '../../../components/ProtectedRoute';

export default function CategoryDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--background)]">
        {/* Header */}
        <Header />
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          <CategoryDetail slug={slug} />
        </main>
      </div>
    </ProtectedRoute>
  );
}