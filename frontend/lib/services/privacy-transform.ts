'use client';

export class PrivacyTransformService {
  private matrix: number[][] | null = null;
  private encryptionKey: CryptoKey | null = null;
  private currentSeed: string | null = null;
  private readonly MATRIX_SIZE = 384;

  constructor() {
    console.log('🔐 PrivacyTransformService: Constructor called');
  }

  private async hashCredentials(username: string, password: string, seed: string): Promise<string> {
    const combined = `${username}:${password}:${seed}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private validateSeed(seed: string): boolean {
    return /^\d{6}$/.test(seed);
  }

  private generateOrthogonalMatrix(size: number, seedHash: string): number[][] {
    console.log(`🎲 PrivacyTransformService: Generating ${size}x${size} orthogonal matrix from seed...`);
    const startTime = performance.now();
    
    // Create seeded random number generator from hash
    let seedValue = 0;
    for (let i = 0; i < seedHash.length; i++) {
      seedValue = ((seedValue << 5) - seedValue + seedHash.charCodeAt(i)) & 0xffffffff;
    }
    
    // Seeded random function (deterministic)
    let seed = seedValue;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    // Generate deterministic random matrix
    const matrix: number[][] = [];
    for (let i = 0; i < size; i++) {
      matrix[i] = [];
      for (let j = 0; j < size; j++) {
        matrix[i][j] = seededRandom() - 0.5; // Deterministic values centered at 0
      }
    }

    // Gram-Schmidt orthogonalization
    for (let i = 0; i < size; i++) {
      // Normalize current vector
      let norm = 0;
      for (let j = 0; j < size; j++) {
        norm += matrix[i][j] * matrix[i][j];
      }
      norm = Math.sqrt(norm);
      
      for (let j = 0; j < size; j++) {
        matrix[i][j] /= norm;
      }

      // Orthogonalize remaining vectors
      for (let k = i + 1; k < size; k++) {
        let dotProduct = 0;
        for (let j = 0; j < size; j++) {
          dotProduct += matrix[i][j] * matrix[k][j];
        }
        
        for (let j = 0; j < size; j++) {
          matrix[k][j] -= dotProduct * matrix[i][j];
        }
      }
    }

    const endTime = performance.now();
    console.log(`✅ PrivacyTransformService: Orthogonal matrix generated in ${(endTime - startTime).toFixed(2)}ms`);
    
    return matrix;
  }

  async initializeMatrix(username: string, password: string, seed: string): Promise<void> {
    if (!this.validateSeed(seed)) {
      throw new Error('Privacy seed must be exactly 6 digits');
    }

    console.log('🔑 PrivacyTransformService: Initializing matrix and encryption key with credentials...');
    
    const seedHash = await this.hashCredentials(username, password, seed);
    this.matrix = this.generateOrthogonalMatrix(this.MATRIX_SIZE, seedHash);
    this.encryptionKey = await this.generateEncryptionKey(seedHash);
    this.currentSeed = seed;
    
    console.log('✅ PrivacyTransformService: Matrix and encryption key initialized from credentials');
  }

  async initializeMatrixFromHash(credentialsHash: string, seed: string): Promise<void> {
    if (!this.validateSeed(seed)) {
      throw new Error('Privacy seed must be exactly 6 digits');
    }

    console.log('🔑 PrivacyTransformService: Initializing matrix and encryption key from credentials hash...');
    console.log('🔑 FRONTEND HASH DEBUG - credentialsHash:', credentialsHash);
    console.log('🔑 FRONTEND HASH DEBUG - seed:', seed);
    
    // Combine credentials hash with seed for final matrix seed
    const finalSeed = `${credentialsHash}:${seed}`;
    console.log('🔑 FRONTEND HASH DEBUG - finalSeed:', finalSeed);
    const seedHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(finalSeed));
    const hashArray = Array.from(new Uint8Array(seedHash));
    const seedHashString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    this.matrix = this.generateOrthogonalMatrix(this.MATRIX_SIZE, seedHashString);
    this.encryptionKey = await this.generateEncryptionKey(seedHashString);
    this.currentSeed = seed;
    
    console.log('✅ PrivacyTransformService: Matrix and encryption key initialized from hash');
  }

  clearMatrix(): void {
    this.matrix = null;
    this.encryptionKey = null;
    this.currentSeed = null;
    console.log('🗑️ PrivacyTransformService: Matrix and encryption key cleared from memory');
  }

  isMatrixReady(): boolean {
    return this.matrix !== null && this.encryptionKey !== null;
  }

  private async generateEncryptionKey(seedHashString: string): Promise<CryptoKey> {
    console.log('🔐 PrivacyTransformService: Generating AES-256 encryption key...');
    console.log('🔐 FRONTEND KEY DEBUG - seedHashString:', seedHashString);
    
    // Use first 32 bytes of seed hash for AES-256 key
    const keyMaterial = new TextEncoder().encode(seedHashString.substring(0, 64)); // First 32 hex chars = 32 bytes
    console.log('🔐 FRONTEND KEY DEBUG - keyMaterial length:', keyMaterial.length);
    console.log('🔐 FRONTEND KEY DEBUG - keyMaterial first 16 bytes:', Array.from(keyMaterial.slice(0, 16)));
    
    // Import raw key material
    const keyMaterialKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial.slice(0, 32), // Ensure exactly 32 bytes for AES-256
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
    
    console.log('✅ PrivacyTransformService: AES-256 key generated');
    return keyMaterialKey;
  }

  async encryptText(text: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized. Call initializeMatrix() first.');
    }

    console.log('🔒 PrivacyTransformService: Encrypting text...');
    
    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    
    // Encrypt the text
    const encodedText = new TextEncoder().encode(text);
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      this.encryptionKey,
      encodedText
    );
    
    // Combine IV + encrypted data and encode as base64
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv, 0);
    combined.set(encryptedArray, iv.length);
    
    const base64Result = btoa(String.fromCharCode(...combined));
    console.log('✅ PrivacyTransformService: Text encrypted');
    
    return base64Result;
  }

  async decryptText(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized. Call initializeMatrix() first.');
    }

    console.log('🔓 PrivacyTransformService: Decrypting text...');
    
    // Decode base64 and extract IV + encrypted data
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12); // First 12 bytes are IV
    const encryptedBuffer = combined.slice(12); // Rest is encrypted data
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      this.encryptionKey,
      encryptedBuffer
    );
    
    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    console.log('✅ PrivacyTransformService: Text decrypted');
    
    return decryptedText;
  }

  transformEmbedding(embedding: Float32Array | number[]): number[] {
    console.log('🔄 PrivacyTransformService: Transforming embedding...', {
      inputLength: embedding.length,
      inputType: embedding.constructor.name
    });

    if (embedding.length !== this.MATRIX_SIZE) {
      throw new Error(`Expected ${this.MATRIX_SIZE}-dimensional embedding, got ${embedding.length}`);
    }

    if (!this.matrix) {
      throw new Error('Matrix not initialized. Call initializeMatrix() with credentials first.');
    }

    const startTime = performance.now();
    const embeddingArray = Array.from(embedding);

    // Matrix multiplication: result = matrix * embedding
    const transformed: number[] = [];
    
    for (let i = 0; i < this.MATRIX_SIZE; i++) {
      let sum = 0;
      for (let j = 0; j < this.MATRIX_SIZE; j++) {
        sum += this.matrix[i][j] * embeddingArray[j];
      }
      transformed[i] = sum;
    }

    const endTime = performance.now();
    console.log('✅ PrivacyTransformService: Embedding transformed', {
      transformTime: `${(endTime - startTime).toFixed(2)}ms`,
      outputLength: transformed.length,
      sampleValues: transformed.slice(0, 5).map(v => v.toFixed(4))
    });

    return transformed;
  }

  // Validate seed format
  static validateSeed(seed: string): boolean {
    return /^\d{6}$/.test(seed);
  }

  // Get matrix info for debugging
  getMatrixInfo(): { hasMatrix: boolean; dimensions: string; seedSet: boolean } {
    return {
      hasMatrix: !!this.matrix,
      dimensions: this.matrix ? `${this.matrix.length}x${this.matrix[0]?.length}` : 'N/A',
      seedSet: !!this.currentSeed
    };
  }
}

// Singleton instance
export const privacyTransformService = new PrivacyTransformService();

// Helper functions
export function transformEmbedding(embedding: Float32Array | number[]): number[] {
  return privacyTransformService.transformEmbedding(embedding);
}

export async function initializePrivacyMatrix(username: string, password: string, seed: string): Promise<void> {
  await privacyTransformService.initializeMatrix(username, password, seed);
}

export function clearPrivacyMatrix(): void {
  privacyTransformService.clearMatrix();
}

export function isPrivacyMatrixReady(): boolean {
  return privacyTransformService.isMatrixReady();
}

export async function encryptText(text: string): Promise<string> {
  return privacyTransformService.encryptText(text);
}

export async function decryptText(encryptedData: string): Promise<string> {
  return privacyTransformService.decryptText(encryptedData);
}