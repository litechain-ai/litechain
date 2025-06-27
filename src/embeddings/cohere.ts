/**
 * Cohere embedding provider implementation
 */

import { BaseEmbeddingProvider, EmbeddingResponse, CohereEmbeddingConfig, estimateTokenCount } from '../types/embeddings';

export class CohereEmbeddingProvider extends BaseEmbeddingProvider {
  public name = 'cohere';
  private apiKey: string;
  private model: string;
  private inputType: string;

  constructor(config: CohereEmbeddingConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model || 'embed-english-v3.0';
    this.inputType = config.inputType || 'search_document';
  }

  async embed(texts: string[]): Promise<EmbeddingResponse> {
    try {
      const response = await fetch('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts,
          model: this.model,
          input_type: this.inputType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        embeddings: data.embeddings,
        usage: {
          totalTokens: texts.reduce((sum, text) => sum + estimateTokenCount(text), 0)
        }
      };
    } catch (error) {
      throw new Error(`Cohere embedding failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
