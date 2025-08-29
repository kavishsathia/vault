// Direct HTTP client for FastAPI backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Helper function to make HTTP requests to FastAPI
async function fetchFromAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get token from localStorage if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('vault_token') : null;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      
      // Try to get more detailed error message from response
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch {
        // Keep the default error message if JSON parsing fails
      }
      
      throw new APIError(errorMessage, response.status, response.statusText);
    }

    return response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    // Handle network errors, etc.
    throw new APIError('Network error or server unavailable', 0, 'Network Error');
  }
}

// API client functions matching your FastAPI routes
export const apiClient = {
  // Categories
  async getCategories(userId?: string) {
    const searchParams = new URLSearchParams();
    if (userId) {
      searchParams.append('user_id', userId);
    }
    const queryString = searchParams.toString();
    return fetchFromAPI(`/api/categories/${queryString ? '?' + queryString : ''}`);
  },

  // Preferences
  async getTopPreferences(userId: string, params: {
    limit?: number;
    category?: string;
    minStrength?: number;
  } = {}) {
    const searchParams = new URLSearchParams();
    searchParams.append('user_id', userId);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.category) searchParams.append('category', params.category);
    if (params.minStrength) searchParams.append('min_strength', params.minStrength.toString());
    
    return fetchFromAPI(`/api/preferences/top?${searchParams}`);
  },

  async createPreference(userId: string, data: {
    text: string;
    categoryId: string;
    strength?: number;
    embedding?: number[];
  }) {
    console.log('📤 APIClient: createPreference called', {
      userId,
      textLength: data.text.length,
      categoryId: data.categoryId,
      strength: data.strength,
      embeddingLength: data.embedding?.length
    });

    const searchParams = new URLSearchParams();
    searchParams.append('user_id', userId);
    
    const requestBody = {
      text: data.text,
      category_slug: data.categoryId, // Note: using category_slug as per API docs
      strength: data.strength || 1.0,
      embedding: data.embedding || [], // Use provided embedding or empty array
    };

    console.log('📤 APIClient: Sending request', {
      endpoint: `/api/preferences/add?${searchParams}`,
      bodyKeys: Object.keys(requestBody),
      embeddingProvided: !!data.embedding
    });
    
    const result = await fetchFromAPI(`/api/preferences/add?${searchParams}`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    console.log('✅ APIClient: createPreference success', { result });
    return result;
  },

  // Apps
  async getIntegratedApps(userId: string, params: {
    limit?: number;
    activeOnly?: boolean;
  } = {}) {
    const searchParams = new URLSearchParams();
    searchParams.append('user_id', userId);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.activeOnly !== undefined) searchParams.append('active_only', params.activeOnly.toString());
    
    return fetchFromAPI(`/api/apps/integrated?${searchParams}`);
  },

  async getAppPreferences(appId: string, userId: string, params: {
    limit?: number;
    category?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    searchParams.append('user_id', userId);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.category) searchParams.append('category', params.category);
    
    return fetchFromAPI(`/api/apps/${appId}/preferences?${searchParams}`);
  },

  async createApp(data: {
    name: string;
    description?: string;
  }) {
    return fetchFromAPI('/api/apps/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAppStats(appId: string, userId: string) {
    const searchParams = new URLSearchParams();
    searchParams.append('user_id', userId);
    
    return fetchFromAPI(`/api/apps/${appId}/stats?${searchParams}`);
  },

  // Permissions
  async getUserPermissions(userId: string) {
    const searchParams = new URLSearchParams();
    searchParams.append('user_id', userId);
    
    return fetchFromAPI(`/api/permissions/user?${searchParams}`);
  },

  async updateAppPermissions(userId: string, data: {
    app_id: string;
    category_id: string;
    can_read: boolean;
    can_write: boolean;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.append('user_id', userId);
    
    return fetchFromAPI(`/api/permissions/update?${searchParams}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPermissionMatrix(userId: string) {
    const searchParams = new URLSearchParams();
    searchParams.append('user_id', userId);
    
    return fetchFromAPI(`/api/permissions/matrix?${searchParams}`);
  },

  async revokeAppPermissions(userId: string, appId: string) {
    const searchParams = new URLSearchParams();
    searchParams.append('user_id', userId);
    searchParams.append('app_id', appId);
    
    return fetchFromAPI(`/api/permissions/revoke?${searchParams}`, {
      method: 'DELETE',
    });
  },

  async grantDefaultPermissions(userId: string, appId: string) {
    const searchParams = new URLSearchParams();
    searchParams.append('user_id', userId);
    searchParams.append('app_id', appId);
    
    return fetchFromAPI(`/api/permissions/grant-default?${searchParams}`, {
      method: 'POST',
    });
  },

  // Query (for external apps)
  async queryPreferences(data: {
    userId: string;
    appId: string;
    query: string;
    categories?: string[];
    limit?: number;
    embedding?: number[];
  }) {
    console.log('📤 APIClient: queryPreferences called', {
      userId: data.userId,
      appId: data.appId,
      queryLength: data.query.length,
      embeddingLength: data.embedding?.length
    });

    const searchParams = new URLSearchParams();
    searchParams.append('user_id', data.userId);
    searchParams.append('app_id', data.appId);
    
    const result = await fetchFromAPI(`/api/preferences/query?${searchParams}`, {
      method: 'POST',
      body: JSON.stringify({
        embedding: data.embedding || [], // Use provided embedding or empty array
        context: data.query,
      }),
    });

    console.log('✅ APIClient: queryPreferences success', { result });
    return result;
  },

  // New multi-embedding context query endpoint
  async queryContexts(data: {
    userId: string;
    appId: string;
    embeddings: number[][];
    context?: string;
  }) {
    console.log('📤 APIClient: queryContexts called', {
      userId: data.userId,
      appId: data.appId,
      embeddingCount: data.embeddings.length,
      embeddingDimensions: data.embeddings[0]?.length,
      contextLength: data.context?.length || 0
    });

    const searchParams = new URLSearchParams();
    searchParams.append('user_id', data.userId);
    searchParams.append('app_id', data.appId);
    
    const requestBody = {
      embeddings: data.embeddings,
      context: data.context,
    };

    console.log('📤 APIClient: Sending queryContexts request', {
      endpoint: `/api/preferences/query-contexts?${searchParams}`,
      embeddingsCount: data.embeddings.length,
      firstEmbeddingPreview: data.embeddings[0]?.slice(0, 3)
    });
    
    const result = await fetchFromAPI(`/api/preferences/query-contexts?${searchParams}`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    console.log('✅ APIClient: queryContexts success', {
      resultsCount: result.results?.length,
      noiseLevel: result.noise_level
    });
    return result;
  },

  // Categories seed (development)
  async seedCategories() {
    return fetchFromAPI('/api/categories/seed', {
      method: 'POST',
    });
  },

  // Health check
  async healthCheck() {
    return fetchFromAPI('/health');
  },

  // Authentication
  async signin(data: { email: string; password: string }) {
    return fetchFromAPI('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async signup(data: { email: string; password: string; name?: string }) {
    return fetchFromAPI('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCurrentUser() {
    return fetchFromAPI('/api/auth/me');
  },
};

export { APIError };