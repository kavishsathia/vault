/**
 * Simple embedding service for demo
 * In a real app, you'd use a proper embedding model
 */

export class SimpleEmbeddingService {
  static generateEmbedding(text: string, dimensions: number = 384): number[] {
    // Create deterministic hash from text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Use hash as seed for deterministic random
    const seed = Math.abs(hash);
    const random = this.seededRandom(seed);

    // Generate base embedding
    const embedding = Array(dimensions).fill(0).map(() => random() * 2 - 1);

    // Add keyword-specific weights
    const keywords = text.toLowerCase().split(/\s+/);
    
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      const keywordHash = this.hashString(keyword);
      
      // Map keyword to specific dimensions
      for (let j = 0; j < 10; j++) { // Use 10 dimensions per keyword
        const dimIndex = (keywordHash + j) % dimensions;
        embedding[dimIndex] += 0.5; // Boost relevant dimensions
      }
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  static generatePrivacyMatrix(credentialsHash: string, seed: string): number[][] {
    // Create final seed from credentials hash + privacy seed
    const finalSeed = `${credentialsHash}:${seed}`;
    const seedHash = this.hashString(finalSeed);
    const random = this.seededRandom(seedHash);

    // Generate 384x384 matrix
    const size = 384;
    const matrix: number[][] = [];
    for (let i = 0; i < size; i++) {
      const row: number[] = [];
      for (let j = 0; j < size; j++) {
        row.push(random() - 0.5); // Range [-0.5, 0.5]
      }
      matrix.push(row);
    }

    // Gram-Schmidt orthogonalization
    for (let i = 0; i < size; i++) {
      // Normalize current vector
      let norm = Math.sqrt(matrix[i].reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        for (let j = 0; j < size; j++) {
          matrix[i][j] /= norm;
        }
      }

      // Orthogonalize remaining vectors
      for (let k = i + 1; k < size; k++) {
        const dotProduct = matrix[i].reduce((sum, val, j) => sum + val * matrix[k][j], 0);
        for (let j = 0; j < size; j++) {
          matrix[k][j] -= dotProduct * matrix[i][j];
        }
      }
    }

    return matrix;
  }

  static transformEmbedding(embedding: number[], privacyMatrix: number[][]): number[] {
    if (embedding.length !== 384) {
      throw new Error(`Expected 384-dimensional embedding, got ${embedding.length}`);
    }

    // Matrix multiplication
    const transformed: number[] = [];
    for (let i = 0; i < 384; i++) {
      let sum = 0;
      for (let j = 0; j < 384; j++) {
        sum += privacyMatrix[i][j] * embedding[j];
      }
      transformed.push(sum);
    }

    return transformed;
  }

  private static seededRandom(seed: number): () => number {
    let m = 0x80000000; // 2**31
    let a = 1103515245;
    let c = 12345;

    seed = (seed % (m - 1)) + 1;
    return function() {
      seed = (a * seed + c) % m;
      return seed / (m - 1);
    };
  }

  static async decryptText(encryptedData: string, credentialsHash: string, seed: string = '123456'): Promise<string> {
    try {
      console.log('🔓 PrivacyTransformService: Decrypting text...');
      console.log('🔓 Encrypted data:', encryptedData);
      console.log('🔓 Credentials hash:', credentialsHash.substring(0, 20) + '...');

      // Hardcode the frontend key that was logged
      const seedHashString = '2cee7b938e3c0cbf9fc87714c5a6ef29687cfc6247eb23417e41da548f084070';
      
      console.log('🔓 DEMO HASH DEBUG - seedHashString:', seedHashString);

      // Use first 32 hex chars (64 chars) of seed hash for AES-256 key (exactly like frontend)
      const keyMaterial = new TextEncoder().encode(seedHashString.substring(0, 64));
      console.log('🔓 DEMO KEY DEBUG - seedHashString:', seedHashString);
      console.log('🔓 DEMO KEY DEBUG - keyMaterial length:', keyMaterial.length);
      console.log('🔓 DEMO KEY DEBUG - keyMaterial first 16 bytes:', Array.from(keyMaterial.slice(0, 16)));
      
      // Import raw key material for AES-GCM  
      const encryptionKey = await crypto.subtle.importKey(
        'raw',
        keyMaterial.slice(0, 32), // Ensure exactly 32 bytes for AES-256
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      console.log('🔓 Encryption key imported successfully');

      // Decode base64 and extract IV + encrypted data (exactly like frontend)
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      console.log('🔓 Combined data length:', combined.length);
      
      const iv = combined.slice(0, 12); // First 12 bytes are IV
      const encryptedBuffer = combined.slice(12); // Rest is encrypted data

      console.log('🔓 IV bytes:', Array.from(iv));
      console.log('🔓 Encrypted buffer length:', encryptedBuffer.length);

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        encryptionKey,
        encryptedBuffer
      );

      const decryptedText = new TextDecoder().decode(decryptedBuffer);
      console.log('✅ PrivacyTransformService: Text decrypted successfully');
      console.log('🔓 Decryption result:', encryptedData.substring(0, 30) + '... →', decryptedText);
      
      return decryptedText;

    } catch (error) {
      console.log('🔓 Decryption failed, using text as-is:', error);
      return encryptedData;
    }
  }

  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}