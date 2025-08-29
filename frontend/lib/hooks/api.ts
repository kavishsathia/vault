import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, APIError } from '../api/client';

// Query keys for consistent caching
export const queryKeys = {
  categories: ['categories'] as const,
  topPreferences: (userId: string, params?: any) => ['preferences', 'top', userId, params] as const,
  integratedApps: (userId: string, params?: any) => ['apps', 'integrated', userId, params] as const,
  pendingApps: (userId: string) => ['apps', 'pending', userId] as const,
  analytics: (userId: string) => ['analytics', userId] as const,
};

// Categories
export function useCategories(userId?: string) {
  return useQuery({
    queryKey: ['categories', userId] as const,
    queryFn: () => apiClient.getCategories(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Preferences
export function useTopPreferences(userId: string, params: {
  limit?: number;
  category?: string;
  minStrength?: number;
} = {}) {
  return useQuery({
    queryKey: queryKeys.topPreferences(userId, params),
    queryFn: async () => {
      try {
        return await apiClient.getTopPreferences(userId, params);
      } catch (error) {
        // Return mock data if endpoint doesn't exist yet
        return {
          preferences: [
            {
              id: "pref_1",
              text: "I love spicy Thai food with extra chilies",
              strength: 8.7,
              category_name: params.category || "Food",
              sources: [
                {
                  app_name: "User",
                  added_at: new Date('2024-01-15').toISOString(),
                  strength: 3.2
                }
              ],
              last_updated: new Date('2024-01-25').toISOString(),
              created_at: new Date('2024-01-15').toISOString()
            }
          ],
          total_count: 1
        };
      }
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreatePreference() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, data }: {
      userId: string;
      data: { text: string; categoryId: string; strength?: number; embedding?: number[] };
    }) => {
      console.log('🎯 useCreatePreference: Mutation called', {
        userId,
        textLength: data.text.length,
        categoryId: data.categoryId,
        strength: data.strength,
        hasEmbedding: !!data.embedding,
        embeddingLength: data.embedding?.length
      });
      return apiClient.createPreference(userId, data);
    },
    onSuccess: (result, { userId }) => {
      console.log('✅ useCreatePreference: Success', { result, userId });
      // Invalidate and refetch preferences
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      queryClient.invalidateQueries({ queryKey: ['analytics', userId] });
    },
    onError: (error) => {
      console.error('❌ useCreatePreference: Error', error);
    },
  });
}

// Apps
export function useIntegratedApps(userId: string, params: {
  limit?: number;
  activeOnly?: boolean;
} = {}) {
  return useQuery({
    queryKey: queryKeys.integratedApps(userId, params),
    queryFn: async () => {
      try {
        return await apiClient.getIntegratedApps(userId, params);
      } catch (error) {
        console.error('❌ useIntegratedApps API Error:', error);
        // Return mock data if endpoint doesn't exist yet
        return {
          apps: [
            {
              id: "app_1",
              name: "FoodieApp",
              description: "AI-powered food recommendations",
              is_active: true,
              created_at: new Date('2024-01-10').toISOString(),
              preferences_contributed: 23,
              queries_made: 147
            }
          ],
          total_count: 1
        };
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePendingApps(userId: string) {
  return useQuery({
    queryKey: queryKeys.pendingApps(userId),
    queryFn: async () => {
      // This endpoint might not exist yet, return empty for now
      return { pending_apps: [] };
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useUpdateAppPermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, data }: {
      userId: string;
      data: {
        app_id: string;
        category_id: string;
        can_read: boolean;
        can_write: boolean;
      };
    }) => apiClient.updateAppPermissions(userId, data),
    onSuccess: (_, { userId }) => {
      // Refresh app data
      queryClient.invalidateQueries({ queryKey: ['apps', 'integrated', userId] });
    },
  });
}

export function useApproveApp() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, appId, permissions }: {
      userId: string;
      appId: string;
      permissions: Array<{
        category_id: string;
        can_read: boolean;
        can_write: boolean;
      }>;
    }) => apiClient.approveApp(userId, appId, permissions),
    onSuccess: (_, { userId }) => {
      // Refresh both pending and integrated apps
      queryClient.invalidateQueries({ queryKey: ['apps', 'pending', userId] });
      queryClient.invalidateQueries({ queryKey: ['apps', 'integrated', userId] });
    },
  });
}

export function useRejectApp() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, appId }: { userId: string; appId: string }) =>
      apiClient.rejectApp(userId, appId),
    onSuccess: (_, { userId }) => {
      // Refresh pending apps
      queryClient.invalidateQueries({ queryKey: ['apps', 'pending', userId] });
    },
  });
}

// Analytics
export function useAnalytics(userId: string) {
  return useQuery({
    queryKey: queryKeys.analytics(userId),
    queryFn: async () => {
      // Return mock data for now since this endpoint might not be implemented yet
      return {
        top_used: [
          { category: "Food", queries: 47 },
          { category: "Gaming", queries: 31 }
        ],
        growing: [
          { category: "Gaming", growth: 23 }
        ],
        hot_topics: ["Spicy", "Dark Mode", "RPG Games"],
        privacy_health_score: 87,
        total_connected_apps: 4,
        apps_need_review: 1,
        suspicious_activity: 0
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Health check
export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.healthCheck(),
    staleTime: 30 * 1000, // 30 seconds
    retry: 3,
    retryDelay: 1000,
  });
}

// Query preferences (for external apps)
export function useQueryPreferences() {
  return useMutation({
    mutationFn: (data: {
      userId: string;
      appId: string;
      query: string;
      categories?: string[];
      limit?: number;
      embedding?: number[];
    }) => {
      console.log('🎯 useQueryPreferences: Mutation called', {
        userId: data.userId,
        appId: data.appId,
        queryLength: data.query.length,
        hasEmbedding: !!data.embedding,
        embeddingLength: data.embedding?.length
      });
      return apiClient.queryPreferences(data);
    },
    onSuccess: (result) => {
      console.log('✅ useQueryPreferences: Success', { result });
    },
    onError: (error) => {
      console.error('❌ useQueryPreferences: Error', error);
    },
  });
}

// Query contexts with multiple embeddings (new endpoint)
export function useQueryContexts() {
  return useMutation({
    mutationFn: (data: {
      userId: string;
      appId: string;
      embeddings: number[][];
      context?: string;
    }) => {
      console.log('🎯 useQueryContexts: Mutation called', {
        userId: data.userId,
        appId: data.appId,
        embeddingCount: data.embeddings.length,
        embeddingDimensions: data.embeddings[0]?.length,
        contextLength: data.context?.length || 0
      });
      return apiClient.queryContexts(data);
    },
    onSuccess: (result) => {
      console.log('✅ useQueryContexts: Success', {
        resultsCount: result.results?.length,
        noiseLevel: result.noise_level
      });
    },
    onError: (error) => {
      console.error('❌ useQueryContexts: Error', error);
    },
  });
}