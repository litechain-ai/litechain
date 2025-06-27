/**
 * Custom embedding provider implementation
 */

import { BaseEmbeddingProvider, EmbeddingResponse, CustomEmbeddingConfig, estimateTokenCount } from '../types/embeddings';

export class CustomEmbeddingProvider extends BaseEmbeddingProvider {
  public name = 'custom';
  private embedFunction: (texts: string[]) => Promise<number[][]>;

  constructor(config: CustomEmbeddingConfig) {
    super();
    this.embedFunction = config.embed;
  }

  async embed(texts: string[]): Promise<EmbeddingResponse> {
    try {
      const embeddings = await this.embedFunction(texts);
      
      return {
        embeddings,
        usage: {
          totalTokens: texts.reduce((sum, text) => sum + estimateTokenCount(text), 0)
        }
      };
    } catch (error) {
      throw new Error(`Custom embedding failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
