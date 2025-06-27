/**
 * Embedding provider types for Litechain
 */

export type EmbeddingVector = number[];

export interface EmbeddingResponse {
  embeddings: EmbeddingVector[];
  usage?: {
    totalTokens: number;
  };
}

export interface EmbeddingProvider {
  name: string;
  embed(texts: string[]): Promise<EmbeddingResponse>;
  embedOne?(text: string): Promise<EmbeddingVector>;
}

export interface OpenAIEmbeddingConfig {
  provider: 'openai';
  apiKey: string;
  model?: string; // Default: 'text-embedding-3-small'
  dimensions?: number;
}

export interface CohereEmbeddingConfig {
  provider: 'cohere';
  apiKey: string;
  model?: string; // Default: 'embed-english-v3.0'
  inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
}

export interface HuggingFaceEmbeddingConfig {
  provider: 'huggingface';
  apiKey: string;
  model?: string; // Default: 'sentence-transformers/all-MiniLM-L6-v2'
}

export interface CustomEmbeddingConfig {
  provider: 'custom';
  embed: (texts: string[]) => Promise<number[][]>;
}

export type EmbeddingConfig = 
  | OpenAIEmbeddingConfig 
  | CohereEmbeddingConfig 
  | HuggingFaceEmbeddingConfig 
  | CustomEmbeddingConfig;

/**
 * Base embedding provider implementation
 */
export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  abstract name: string;
  abstract embed(texts: string[]): Promise<EmbeddingResponse>;

  /**
   * Embed a single text string
   */
  async embedOne(text: string): Promise<EmbeddingVector> {
    const response = await this.embed([text]);
    return response.embeddings[0];
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  static cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find most similar embeddings to a query
   */
  static findMostSimilar(
    queryEmbedding: EmbeddingVector,
    candidateEmbeddings: { embedding: EmbeddingVector; metadata?: any }[],
    topK: number = 5
  ): Array<{ similarity: number; metadata?: any }> {
    const similarities = candidateEmbeddings.map(candidate => ({
      similarity: BaseEmbeddingProvider.cosineSimilarity(queryEmbedding, candidate.embedding),
      metadata: candidate.metadata
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}

/**
 * Utility function to estimate token count for embedding pricing
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Embedding model pricing (per 1M tokens in USD)
 */
export const EMBEDDING_PRICING: Record<string, number> = {
  // OpenAI
  'text-embedding-3-small': 0.02,
  'text-embedding-3-large': 0.13,
  'text-embedding-ada-002': 0.10,
  
  // Cohere
  'embed-english-v3.0': 0.10,
  'embed-multilingual-v3.0': 0.10,
  'embed-english-light-v3.0': 0.10,
  'embed-multilingual-light-v3.0': 0.10,
};
