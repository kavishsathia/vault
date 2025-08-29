import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

// Base URL for the FastAPI backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper function to make HTTP requests to FastAPI
async function fetchFromAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const appRouter = t.router({
  // Get top preferences with temporal decay
  getTopPreferences: t.procedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().optional().default(20),
      category: z.string().optional(),
      minStrength: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const params = new URLSearchParams();
      params.append('limit', input.limit.toString());
      if (input.category) params.append('category', input.category);
      if (input.minStrength) params.append('min_strength', input.minStrength.toString());
      
      return fetchFromAPI(`/users/${input.userId}/preferences/top?${params}`);
    }),

  // Get integrated apps
  getIntegratedApps: t.procedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().optional().default(20),
      activeOnly: z.boolean().optional().default(true),
    }))
    .query(async ({ input }) => {
      const params = new URLSearchParams();
      params.append('limit', input.limit.toString());
      if (input.activeOnly !== undefined) params.append('active_only', input.activeOnly.toString());
      
      return fetchFromAPI(`/users/${input.userId}/apps/integrated?${params}`);
    }),

  // Get pending app requests
  getPendingApps: t.procedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      return fetchFromAPI(`/users/${input.userId}/apps/pending`);
    }),

  // Get preference categories
  getCategories: t.procedure.query(async () => {
    return fetchFromAPI('/categories');
  }),

  // Get analytics insights
  getAnalytics: t.procedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      return fetchFromAPI(`/users/${input.userId}/analytics`);
    }),

  // Create new preference
  createPreference: t.procedure
    .input(z.object({
      userId: z.string(),
      text: z.string(),
      categoryId: z.string(),
      strength: z.number().optional().default(1.0),
    }))
    .mutation(async ({ input }) => {
      return fetchFromAPI(`/users/${input.userId}/preferences`, {
        method: 'POST',
        body: JSON.stringify({
          text: input.text,
          category_id: input.categoryId,
          strength: input.strength,
        }),
      });
    }),

  // Update app permissions
  updateAppPermissions: t.procedure
    .input(z.object({
      userId: z.string(),
      appId: z.string(),
      permissions: z.array(z.object({
        category_id: z.string(),
        can_read: z.boolean(),
        can_write: z.boolean(),
      })),
    }))
    .mutation(async ({ input }) => {
      return fetchFromAPI(`/users/${input.userId}/apps/${input.appId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({
          permissions: input.permissions,
        }),
      });
    }),

  // Query preferences (for apps to use)
  queryPreferences: t.procedure
    .input(z.object({
      userId: z.string(),
      appId: z.string(),
      query: z.string(),
      categories: z.array(z.string()).optional(),
      limit: z.number().optional().default(10),
    }))
    .mutation(async ({ input }) => {
      return fetchFromAPI(`/query`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: input.userId,
          app_id: input.appId,
          query_text: input.query,
          categories: input.categories,
          limit: input.limit,
        }),
      });
    }),

  // Approve pending app
  approveApp: t.procedure
    .input(z.object({
      userId: z.string(),
      appId: z.string(),
      permissions: z.array(z.object({
        category_id: z.string(),
        can_read: z.boolean(),
        can_write: z.boolean(),
      })),
    }))
    .mutation(async ({ input }) => {
      return fetchFromAPI(`/users/${input.userId}/apps/${input.appId}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          permissions: input.permissions,
        }),
      });
    }),

  // Reject pending app
  rejectApp: t.procedure
    .input(z.object({
      userId: z.string(),
      appId: z.string(),
    }))
    .mutation(async ({ input }) => {
      return fetchFromAPI(`/users/${input.userId}/apps/${input.appId}/reject`, {
        method: 'POST',
      });
    }),
});

export type AppRouter = typeof appRouter;