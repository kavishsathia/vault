'use client';

import { useState, useEffect } from 'react';
import { useCategories, useCreatePreference } from '../lib/hooks/api';
import { embeddingService, embeddingToArray, ensureEmbeddingService } from '../lib/services/embeddings';

interface AddPreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function AddPreferenceModal({ isOpen, onClose, userId }: AddPreferenceModalProps) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [strength, setStrength] = useState(5);
  const [isGeneratingEmbedding, setIsGeneratingEmbedding] = useState(false);
  const [embeddingServiceStatus, setEmbeddingServiceStatus] = useState('uninitialized');

  const { data: categories } = useCategories();
  const createPreference = useCreatePreference();

  // Initialize embedding service when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🎯 AddPreferenceModal: Modal opened, initializing embedding service...');
      const initializeService = async () => {
        try {
          setEmbeddingServiceStatus('initializing');
          await ensureEmbeddingService();
          setEmbeddingServiceStatus('ready');
          console.log('✅ AddPreferenceModal: Embedding service ready');
        } catch (error) {
          console.error('❌ AddPreferenceModal: Failed to initialize embedding service:', error);
          setEmbeddingServiceStatus('error');
        }
      };
      initializeService();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 AddPreferenceModal: Form submitted', {
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      category,
      strength,
      userId
    });

    if (!text.trim() || !category) {
      console.warn('⚠️ AddPreferenceModal: Form validation failed');
      return;
    }

    try {
      setIsGeneratingEmbedding(true);
      console.log('🔄 AddPreferenceModal: Generating embedding...');
      
      const startTime = performance.now();
      const embedding = await embeddingService.generateEmbedding(text.trim());
      const endTime = performance.now();
      
      const generationTime = ((endTime - startTime)).toFixed(2);
      console.log('✅ AddPreferenceModal: Embedding generated', {
        generationTime: `${generationTime}ms`,
        embeddingLength: embedding.length,
        firstFewValues: Array.from(embedding.slice(0, 3)).map(v => v.toFixed(4))
      });

      // Convert to array for API
      const embeddingArray = embeddingToArray(embedding);
      
      console.log('📤 AddPreferenceModal: Sending to API...', {
        text,
        categoryId: category,
        strength: strength / 10, // Convert to 0-1 scale
        embeddingDimensions: embeddingArray.length,
        userId
      });

      await createPreference.mutateAsync({
        userId,
        data: {
          text: text.trim(),
          categoryId: category,
          strength: strength / 10, // Convert 1-10 scale to 0-1 scale
          embedding: embeddingArray
        }
      });

      console.log('✅ AddPreferenceModal: Preference created successfully');
      
      // Reset form
      setText('');
      setCategory('');
      setStrength(5);
      onClose();

    } catch (error) {
      console.error('❌ AddPreferenceModal: Failed to create preference:', error);
    } finally {
      setIsGeneratingEmbedding(false);
    }
  };

  const isSubmitDisabled = !text.trim() || !category || isGeneratingEmbedding || embeddingServiceStatus !== 'ready';

  console.log('🔄 AddPreferenceModal: Render state', {
    isOpen,
    embeddingServiceStatus,
    isGeneratingEmbedding,
    isSubmitDisabled,
    hasCategories: !!categories?.categories?.length
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-heading text-xl font-semibold text-white">
            Add Preference
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--foreground-muted)] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Embedding Service Status */}
        <div className="mb-4 p-3 rounded-lg bg-[var(--surface-light)]">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              embeddingServiceStatus === 'ready' ? 'bg-[var(--success)]' :
              embeddingServiceStatus === 'initializing' ? 'bg-yellow-500 animate-pulse' :
              embeddingServiceStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
            }`} />
            <span className="text-xs text-[var(--foreground-muted)]">
              Web LLM: {
                embeddingServiceStatus === 'ready' ? 'Ready' :
                embeddingServiceStatus === 'initializing' ? 'Loading model...' :
                embeddingServiceStatus === 'error' ? 'Failed to load' : 'Uninitialized'
              }
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Text Input */}
          <div>
            <label htmlFor="preference-text" className="block text-sm font-medium text-[var(--foreground-light)] mb-2">
              Preference Description
            </label>
            <textarea
              id="preference-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                console.log('📝 AddPreferenceModal: Text changed', {
                  length: e.target.value.length,
                  preview: e.target.value.substring(0, 30) + (e.target.value.length > 30 ? '...' : '')
                });
              }}
              placeholder="e.g., I love spicy Thai food with extra chilies"
              className="w-full p-3 bg-[var(--background)] border border-[var(--surface-light)] rounded-lg text-white placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--purple-primary)] transition-colors"
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-[var(--foreground-muted)] mt-1">
              {text.length}/500 characters
            </div>
          </div>

          {/* Category Select */}
          <div>
            <label htmlFor="preference-category" className="block text-sm font-medium text-[var(--foreground-light)] mb-2">
              Category
            </label>
            <select
              id="preference-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                console.log('📂 AddPreferenceModal: Category changed', { category: e.target.value });
              }}
              className="w-full p-3 bg-[var(--background)] border border-[var(--surface-light)] rounded-lg text-white focus:outline-none focus:border-[var(--purple-primary)] transition-colors"
            >
              <option value="">Select a category</option>
              {categories?.categories?.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Strength Slider */}
          <div>
            <label htmlFor="preference-strength" className="block text-sm font-medium text-[var(--foreground-light)] mb-2">
              Strength: {strength}/10
            </label>
            <input
              id="preference-strength"
              type="range"
              min="1"
              max="10"
              value={strength}
              onChange={(e) => {
                const newStrength = parseInt(e.target.value);
                setStrength(newStrength);
                console.log('💪 AddPreferenceModal: Strength changed', { strength: newStrength });
              }}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-[var(--foreground-muted)] mt-1">
              <span>Weak</span>
              <span>Strong</span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-[var(--surface-light)] text-[var(--foreground-muted)] rounded-lg hover:bg-[var(--background)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-[var(--purple-primary)] to-[var(--purple-light)] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-[var(--purple-dark)] hover:to-[var(--purple-primary)] transition-all"
            >
              {isGeneratingEmbedding ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                'Add Preference'
              )}
            </button>
          </div>
        </form>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-[var(--background)] rounded-lg border border-[var(--surface-light)]">
            <div className="text-xs text-[var(--foreground-muted)] space-y-1">
              <div>🔧 Debug Info:</div>
              <div>Service Status: {embeddingServiceStatus}</div>
              <div>Generating: {isGeneratingEmbedding ? 'Yes' : 'No'}</div>
              <div>Submit Disabled: {isSubmitDisabled ? 'Yes' : 'No'}</div>
              <div>Categories Loaded: {categories?.categories?.length || 0}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}