/**
 * OpenAI embedding provider implementation
 */

import OpenAI from 'openai';
import { BaseEmbeddingProvider, EmbeddingResponse, OpenAIEmbeddingConfig } from '../types/embeddings';

export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  public name = 'openai';
  private client: OpenAI;
  private model: string;
  private dimensions?: number;

  constructor(config: OpenAIEmbeddingConfig) {
    super();
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model || 'text-embedding-3-small';
    this.dimensions = config.dimensions;
  }

  async embed(texts: string[]): Promise<EmbeddingResponse> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
        dimensions: this.dimensions,
      });

      return {
        embeddings: response.data.map(item => item.embedding),
        usage: {
          totalTokens: response.usage.total_tokens
        }
      };
    } catch (error) {
      throw new Error(`OpenAI embedding failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
