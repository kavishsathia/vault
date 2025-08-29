import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

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
      // Mock data matching backend schema
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API delay
      
      return {
        preferences: [
          {
            id: "pref_1",
            text: "I absolutely love spicy Thai food with extra chilies",
            strength: 8.7,
            category_name: "Food",
            sources: [
              {
                app_name: "User",
                added_at: new Date('2024-01-15'),
                strength: 3.2
              },
              {
                app_name: "FoodieApp",
                added_at: new Date('2024-01-20'),
                strength: 2.8
              },
              {
                app_name: "ChefBot",
                added_at: new Date('2024-01-25'),
                strength: 2.7
              }
            ],
            last_updated: new Date('2024-01-25'),
            created_at: new Date('2024-01-15')
          },
          {
            id: "pref_2", 
            text: "Dark mode interfaces with high contrast",
            strength: 9.2,
            category_name: "UI/UX",
            sources: [
              {
                app_name: "User",
                added_at: new Date('2024-01-10'),
                strength: 4.1
              },
              {
                app_name: "WorkFlow",
                added_at: new Date('2024-01-18'),
                strength: 3.8
              },
              {
                app_name: "CodeEditor",
                added_at: new Date('2024-01-22'),
                strength: 1.3
              }
            ],
            last_updated: new Date('2024-01-22'),
            created_at: new Date('2024-01-10')
          },
          {
            id: "pref_3",
            text: "Challenging RPG games with deep storylines",
            strength: 7.4,
            category_name: "Gaming",
            sources: [
              {
                app_name: "User",
                added_at: new Date('2024-01-12'),
                strength: 2.9
              },
              {
                app_name: "GameRec",
                added_at: new Date('2024-01-19'),
                strength: 2.2
              },
              {
                app_name: "SteamBot",
                added_at: new Date('2024-01-24'),
                strength: 2.3
              }
            ],
            last_updated: new Date('2024-01-24'),
            created_at: new Date('2024-01-12')
          },
          {
            id: "pref_4",
            text: "Minimalist workspaces with natural light",
            strength: 6.8,
            category_name: "Work & Productivity",
            sources: [
              {
                app_name: "User",
                added_at: new Date('2024-01-14'),
                strength: 3.5
              },
              {
                app_name: "WorkSpace",
                added_at: new Date('2024-01-21'),
                strength: 3.3
              }
            ],
            last_updated: new Date('2024-01-21'),
            created_at: new Date('2024-01-14')
          }
        ],
        total_count: 47
      };
    }),

  // Get integrated apps
  getIntegratedApps: t.procedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().optional().default(20),
      activeOnly: z.boolean().optional().default(true),
    }))
    .query(async ({ input }) => {
      await new Promise(resolve => setTimeout(resolve, 150));
      
      return {
        apps: [
          {
            id: "app_1",
            name: "SpotifyAI",
            description: "Music & Entertainment preference learning",
            is_active: true,
            trust_score: 9.2,
            created_at: new Date('2024-01-12'),
            last_query_at: new Date('2024-01-25T10:30:00').toISOString(),
            permissions: [
              { category_id: "cat_2", category_name: "Entertainment", can_read: true, can_write: true },
              { category_id: "cat_6", category_name: "Social", can_read: true, can_write: false },
              { category_id: "cat_4", category_name: "UI/UX", can_read: true, can_write: false }
            ],
            preferences_contributed: 47,
            queries_made: 1247
          },
          {
            id: "app_2",
            name: "FoodieApp",
            description: "Food & Dining recommendation engine",
            is_active: true,
            trust_score: 7.8,
            created_at: new Date('2024-01-10'),
            last_query_at: new Date('2024-01-25T09:15:00').toISOString(),
            permissions: [
              { category_id: "cat_1", category_name: "Food", can_read: true, can_write: true },
              { category_id: "cat_8", category_name: "Health & Fitness", can_read: false, can_write: false }
            ],
            preferences_contributed: 23,
            queries_made: 892
          },
          {
            id: "app_3",
            name: "WorkFlow",
            description: "Productivity & Work optimization",
            is_active: false,
            trust_score: 6.4,
            created_at: new Date('2024-01-15'),
            last_query_at: new Date('2024-01-22T14:20:00').toISOString(),
            permissions: [
              { category_id: "cat_3", category_name: "Work & Productivity", can_read: true, can_write: false },
              { category_id: "cat_4", category_name: "UI/UX", can_read: true, can_write: false }
            ],
            preferences_contributed: 12,
            queries_made: 234
          },
          {
            id: "app_4",
            name: "GameRec",
            description: "Gaming recommendations and discovery",
            is_active: true,
            trust_score: 8.9,
            created_at: new Date('2024-01-18'),
            last_query_at: new Date('2024-01-25T16:45:00').toISOString(),
            permissions: [
              { category_id: "cat_5", category_name: "Gaming", can_read: true, can_write: true },
              { category_id: "cat_2", category_name: "Entertainment", can_read: true, can_write: false }
            ],
            preferences_contributed: 34,
            queries_made: 567
          }
        ],
        total_count: 4
      };
    }),

  // Get pending app requests
  getPendingApps: t.procedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        pending_apps: [
          {
            id: "pending_1",
            name: "GitHelper",
            description: "Code repository preference assistant",
            requested_permissions: ["Work & Productivity", "Learning", "UI/UX"],
            requested_at: new Date('2024-01-24T08:30:00').toISOString()
          },
          {
            id: "pending_2", 
            name: "TravelTracker",
            description: "Travel planning and preference management",
            requested_permissions: ["Travel", "Food", "Social"],
            requested_at: new Date('2024-01-23T15:20:00').toISOString()
          },
          {
            id: "pending_3",
            name: "ShopBot",
            description: "Smart shopping recommendation engine",
            requested_permissions: ["Shopping", "Food", "Health & Fitness"],
            requested_at: new Date('2024-01-22T11:10:00').toISOString()
          }
        ],
        total_count: 3
      };
    }),

  // Get preference categories
  getCategories: t.procedure.query(async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      categories: [
        {
          id: "cat_1",
          name: "Food",
          slug: "food",
          description: "Dietary preferences, cuisine types, spice tolerance",
          preference_count: 23
        },
        {
          id: "cat_2", 
          name: "Entertainment",
          slug: "entertainment",
          description: "Movie genres, music styles, content preferences",
          preference_count: 18
        },
        {
          id: "cat_3",
          name: "Work & Productivity",
          slug: "work-productivity", 
          description: "Workflow preferences, tool choices, communication styles",
          preference_count: 15
        },
        {
          id: "cat_4",
          name: "UI/UX",
          slug: "ui-ux",
          description: "Dark mode, font sizes, layout preferences, accessibility needs",
          preference_count: 12
        },
        {
          id: "cat_5",
          name: "Gaming",
          slug: "gaming",
          description: "Difficulty levels, game genres, control schemes",
          preference_count: 31
        },
        {
          id: "cat_6",
          name: "Social",
          slug: "social",
          description: "Interaction preferences, privacy levels, communication frequency",
          preference_count: 8
        },
        {
          id: "cat_7",
          name: "Shopping",
          slug: "shopping",
          description: "Brand preferences, price sensitivity, product categories",
          preference_count: 6
        },
        {
          id: "cat_8",
          name: "Health & Fitness",
          slug: "health-fitness",
          description: "Activity types, intensity levels, health goals",
          preference_count: 11
        },
        {
          id: "cat_9",
          name: "Travel",
          slug: "travel",
          description: "Accommodation preferences, transportation, activity types",
          preference_count: 9
        },
        {
          id: "cat_10",
          name: "Learning",
          slug: "learning",
          description: "Learning styles, content formats, difficulty progression",
          preference_count: 14
        }
      ]
    };
  }),

  // Get analytics insights
  getAnalytics: t.procedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return {
        top_used: [
          { category: "Food", queries: 47 },
          { category: "Gaming", queries: 31 },
          { category: "Entertainment", queries: 28 },
          { category: "UI/UX", queries: 19 }
        ],
        growing: [
          { category: "Gaming", growth: 23 },
          { category: "Travel", growth: 18 }, 
          { category: "Health & Fitness", growth: 15 }
        ],
        hot_topics: [
          "🌶️ Spicy",
          "🌙 Dark Mode", 
          "🎮 RPG Games",
          "☕ Coffee"
        ],
        privacy_health_score: 87,
        total_connected_apps: 12,
        apps_need_review: 3,
        suspicious_activity: 0
      };
    }),
});

export type AppRouter = typeof appRouter;