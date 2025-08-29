'use client';

import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

class EmbeddingService {
  private engine: MLCEngine | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    console.log('🔧 EmbeddingService: Constructor called');
  }

  async initialize(): Promise<void> {
    if (this.engine) {
      console.log('✅ EmbeddingService: Already initialized');
      return;
    }

    if (this.isInitializing && this.initPromise) {
      console.log('⏳ EmbeddingService: Already initializing, waiting...');
      return this.initPromise;
    }

    this.isInitializing = true;
    console.log('🚀 EmbeddingService: Starting initialization...');

    this.initPromise = this._doInitialize();
    await this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      console.log('🔄 EmbeddingService: Creating MLC Engine...');
      const startTime = performance.now();

      // Use a dedicated embedding model from Web LLM
      const modelId = "snowflake-arctic-embed-s-q0f32-MLC-b32";
      console.log(`📦 EmbeddingService: Loading model: ${modelId}`);

      this.engine = await CreateMLCEngine(modelId, {
        progressCallback: (report) => {
          console.log(`📥 EmbeddingService: Loading progress: ${report.text}`);
        },
      });

      const endTime = performance.now();
      const loadTime = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log(`✅ EmbeddingService: Model loaded successfully in ${loadTime}s`);
      console.log('🔧 EmbeddingService: Engine details:', {
        modelId,
        engineReady: !!this.engine
      });

    } catch (error) {
      console.error('❌ EmbeddingService: Failed to initialize:', error);
      this.engine = null;
      throw new Error(`Failed to initialize embedding service: ${error}`);
    } finally {
      this.isInitializing = false;
    }
  }

  async generateEmbedding(text: string): Promise<Float32Array> {
    console.log('🎯 EmbeddingService: generateEmbedding called', { 
      textLength: text.length, 
      textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
    });

    if (!this.engine) {
      console.log('⚠️ EmbeddingService: Engine not initialized, initializing now...');
      await this.initialize();
    }

    if (!this.engine) {
      const error = 'Engine is null after initialization';
      console.error('❌ EmbeddingService:', error);
      throw new Error(error);
    }

    try {
      console.log('🔄 EmbeddingService: Generating embedding...');
      const startTime = performance.now();

      // Generate embedding using the embeddings API
      const embeddingResponse = await this.engine.embeddings.create({
        input: text,
        model: "snowflake-arctic-embed-s-q0f32-MLC-b32"
      });
      
      // Extract embedding from response
      const embedding = new Float32Array(embeddingResponse.data[0].embedding);
      
      const endTime = performance.now();
      const genTime = ((endTime - startTime)).toFixed(2);

      console.log('✅ EmbeddingService: Embedding generated successfully', {
        generationTime: `${genTime}ms`,
        embeddingShape: embedding.length,
        embeddingType: embedding.constructor.name,
        sampleValues: Array.from(embedding.slice(0, 5)).map(v => v.toFixed(4))
      });

      // Snowflake Arctic Embed S outputs 384 dimensions
      const expectedDimensions = 384;
      
      if (embedding.length !== expectedDimensions) {
        console.warn('⚠️ EmbeddingService: Embedding dimension mismatch', {
          expected: expectedDimensions,
          actual: embedding.length,
          model: 'snowflake-arctic-embed-s'
        });
        
        // For now, we'll work with whatever dimensions we get
        // The backend will need to be updated to handle 384-dim vectors
        console.log('📏 EmbeddingService: Using actual embedding dimensions from model');
      }

      return embedding;

    } catch (error) {
      console.error('❌ EmbeddingService: Failed to generate embedding:', error);
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  async generateMultipleEmbeddings(texts: string[]): Promise<Float32Array[]> {
    console.log('🎯 EmbeddingService: generateMultipleEmbeddings called', { 
      count: texts.length,
      textPreviews: texts.slice(0, 3).map(text => 
        text.substring(0, 30) + (text.length > 30 ? '...' : '')
      )
    });

    const results: Float32Array[] = [];
    const startTime = performance.now();

    for (let i = 0; i < texts.length; i++) {
      console.log(`🔄 EmbeddingService: Processing text ${i + 1}/${texts.length}`);
      const embedding = await this.generateEmbedding(texts[i]);
      results.push(embedding);
    }

    const endTime = performance.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log('✅ EmbeddingService: Multiple embeddings generated', {
      count: results.length,
      totalTime: `${totalTime}s`,
      averageTime: `${(parseFloat(totalTime) / texts.length).toFixed(2)}s per embedding`
    });

    return results;
  }

  isReady(): boolean {
    const ready = !!this.engine && !this.isInitializing;
    console.log('❓ EmbeddingService: isReady check', { ready, hasEngine: !!this.engine, isInitializing: this.isInitializing });
    return ready;
  }

  getStatus(): string {
    if (this.isInitializing) return 'initializing';
    if (this.engine) return 'ready';
    return 'uninitialized';
  }
}

// Create singleton instance
export const embeddingService = new EmbeddingService();

// Helper function to convert Float32Array to regular array for JSON serialization
export function embeddingToArray(embedding: Float32Array): number[] {
  const array = Array.from(embedding);
  console.log('🔄 EmbeddingService: Converted Float32Array to Array', {
    length: array.length,
    sampleValues: array.slice(0, 5).map(v => v.toFixed(4))
  });
  return array;
}

// Helper function to ensure embedding service is ready
export async function ensureEmbeddingService(): Promise<void> {
  console.log('🔧 EmbeddingService: ensureEmbeddingService called');
  if (!embeddingService.isReady()) {
    console.log('⚠️ EmbeddingService: Service not ready, initializing...');
    await embeddingService.initialize();
  }
  console.log('✅ EmbeddingService: Service is ready');
}