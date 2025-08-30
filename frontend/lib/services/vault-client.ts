'use client';

import { PrivacyTransformService } from './privacy-transform';

export interface VaultToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  credentials_hash?: string;
}

export interface VaultPreference {
  text: string;
  category?: string;
  strength: number;
  created_at: string;
}

export class VaultClient {
  private apiUrl: string;
  private token: VaultToken;
  private privacyTransform: PrivacyTransformService;

  constructor(token: VaultToken, apiUrl: string = 'http://localhost:8000/api') {
    this.token = token;
    this.apiUrl = apiUrl;
    this.privacyTransform = new PrivacyTransformService();
  }

  /**
   * Initialize privacy matrix using user's 6-digit seed
   * This must be called before using any preference methods
   */
  async initializePrivacy(privacySeed: string): Promise<void> {
    if (!this.token.credentials_hash) {
      throw new Error('Token does not contain credentials hash. Privacy matrix cannot be generated.');
    }

    if (!/^\d{6}$/.test(privacySeed)) {
      throw new Error('Privacy seed must be exactly 6 digits');
    }

    console.log('🔐 VaultClient: Initializing privacy matrix...');
    
    // Generate matrix using credentials hash + seed
    await this.privacyTransform.initializeMatrixFromHash(this.token.credentials_hash, privacySeed);
    
    console.log('✅ VaultClient: Privacy matrix ready');
  }

  /**
   * Query preferences by similarity
   */
  async queryPreferences(queryText: string, context?: string): Promise<{ score: number; confidence: number }> {
    if (!this.privacyTransform.isMatrixReady()) {
      throw new Error('Privacy matrix not initialized. Call initializePrivacy() first.');
    }

    // Generate and transform embedding
    const embedding = await this.generateEmbedding(queryText);
    const transformedEmbedding = this.privacyTransform.transformEmbedding(embedding);

    const response = await fetch(`${this.apiUrl}/preferences/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embedding: transformedEmbedding,
        context: context
      })
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Add a new preference
   */
  async addPreference(text: string, category?: string, strength: number = 1.0): Promise<VaultPreference> {
    if (!this.privacyTransform.isMatrixReady()) {
      throw new Error('Privacy matrix not initialized. Call initializePrivacy() first.');
    }

    // Generate and transform embedding
    const embedding = await this.generateEmbedding(text);
    const transformedEmbedding = this.privacyTransform.transformEmbedding(embedding);
    
    // Encrypt the preference text
    const encryptedText = await this.privacyTransform.encryptText(text);

    const response = await fetch(`${this.apiUrl}/preferences/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: encryptedText, // Send encrypted text instead of plaintext
        embedding: transformedEmbedding,
        category_slug: category,
        strength: strength
      })
    });

    if (!response.ok) {
      throw new Error(`Add preference failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Decrypt the returned text for client use
    if (result.text) {
      result.text = await this.privacyTransform.decryptText(result.text);
    }

    return result;
  }

  /**
   * Get user's top preferences
   */
  async getTopPreferences(category?: string, limit: number = 20): Promise<VaultPreference[]> {
    if (!this.privacyTransform.isMatrixReady()) {
      throw new Error('Privacy matrix not initialized. Call initializePrivacy() first.');
    }

    const params = new URLSearchParams({
      limit: limit.toString()
    });

    if (category) {
      params.append('category', category);
    }

    const response = await fetch(`${this.apiUrl}/preferences/top?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Get preferences failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Decrypt all preference texts
    if (data.preferences) {
      for (const pref of data.preferences) {
        if (pref.text) {
          try {
            pref.text = await this.privacyTransform.decryptText(pref.text);
          } catch (error) {
            console.warn('Failed to decrypt preference text:', error);
            // Keep encrypted text if decryption fails (backward compatibility)
          }
        }
      }
    }
    
    return data.preferences;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Simple placeholder - in production, apps would use their own embedding service
    // or import the Vault embedding service
    throw new Error('Apps must provide their own embedding generation');
  }
}

/**
 * Helper function to create VaultClient from OAuth token response
 */
export function createVaultClient(tokenResponse: VaultToken): VaultClient {
  return new VaultClient(tokenResponse);
}

/**
 * Example usage for third-party apps:
 * 
 * ```typescript
 * // After OAuth flow
 * const token = await exchangeCodeForToken(authCode);
 * const vault = createVaultClient(token);
 * 
 * // User enters their privacy seed
 * const seed = prompt("Enter your 6-digit Vault privacy seed:");
 * await vault.initializePrivacy(seed);
 * 
 * // Now you can access preferences
 * const score = await vault.queryPreferences("dark theme interfaces");
 * const prefs = await vault.getTopPreferences("ui-ux", 10);
 * ```
 */