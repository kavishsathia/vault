'use client';

import { useState } from 'react';
import { useTopPreferences } from '../lib/hooks/api';
import AddPreferenceModal from './AddPreferenceModal';

interface TopPreferencesWidgetProps {
  userId: string;
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

export default function TopPreferencesWidget({ userId }: TopPreferencesWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: preferences, isLoading, error } = useTopPreferences(userId, {
    limit: 4
  });

  const handleAddPreference = () => {
    console.log('🎯 TopPreferencesWidget: Add preference clicked', { userId });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    console.log('🔄 TopPreferencesWidget: Modal closed');
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="bg-[var(--surface)] rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-[var(--surface-light)] rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 bg-[var(--surface-light)] rounded w-32"></div>
              <div className="h-2 bg-[var(--surface-light)] rounded w-20"></div>
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
          Top Preferences
        </h3>
        <span className="text-xs text-[var(--foreground-muted)]">
          {preferences?.total_count} total
        </span>
      </div>

      <div className="space-y-4">
        {preferences?.preferences.slice(0, 4).map((pref) => (
          <div key={pref.id} className="group/item hover:bg-[var(--surface-light)] -mx-2 px-2 py-2 rounded-lg transition-colors">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-[var(--foreground-light)] font-medium text-sm line-clamp-2 flex-1 mr-2">
                {pref.text.length > 50 ? `${pref.text.substring(0, 47)}...` : pref.text}
              </h4>
            </div>
            <div className="flex justify-between items-center">
              <StrengthBar strength={pref.strength} />
              <span className="text-xs text-[var(--foreground-muted)]">
                {pref.category_name}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={handleAddPreference}
        className="w-full mt-4 py-2 text-sm text-[var(--purple-primary)] hover:text-[var(--purple-light)] font-medium transition-colors opacity-0 group-hover:opacity-100"
      >
        + Add More
      </button>

      {/* Add Preference Modal */}
      <AddPreferenceModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        userId={userId}
      />
    </div>
  );
}