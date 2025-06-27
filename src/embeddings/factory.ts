/**
 * Embedding provider factory
 */

import { EmbeddingConfig, EmbeddingProvider } from '../types/embeddings';
import { OpenAIEmbeddingProvider } from './openai';
import { CohereEmbeddingProvider } from './cohere';
import { HuggingFaceEmbeddingProvider } from './huggingface';
import { CustomEmbeddingProvider } from './custom';

/**
 * Create an embedding provider based on configuration
 */
export function createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIEmbeddingProvider(config);
    
    case 'cohere':
      return new CohereEmbeddingProvider(config);
    
    case 'huggingface':
      return new HuggingFaceEmbeddingProvider(config);
    
    case 'custom':
      return new CustomEmbeddingProvider(config);
    
    default:
      throw new Error(`Unknown embedding provider: ${(config as any).provider}`);
  }
}

/**
 * Default embedding provider (OpenAI with text-embedding-3-small)
 */
export function createDefaultEmbeddingProvider(apiKey: string): EmbeddingProvider {
  return new OpenAIEmbeddingProvider({
    provider: 'openai',
    apiKey,
    model: 'text-embedding-3-small'
  });
}
