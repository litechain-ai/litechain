/**
 * Hugging Face embedding provider implementation
 */

import { BaseEmbeddingProvider, EmbeddingResponse, HuggingFaceEmbeddingConfig, estimateTokenCount } from '../types/embeddings';

export class HuggingFaceEmbeddingProvider extends BaseEmbeddingProvider {
  public name = 'huggingface';
  private apiKey: string;
  private model: string;

  constructor(config: HuggingFaceEmbeddingConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model || 'sentence-transformers/all-MiniLM-L6-v2';
  }

  async embed(texts: string[]): Promise<EmbeddingResponse> {
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: texts,
            options: { wait_for_model: true }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle both single and batch responses
      const embeddings = Array.isArray(data[0]) ? data : [data];
      
      return {
        embeddings,
        usage: {
          totalTokens: texts.reduce((sum, text) => sum + estimateTokenCount(text), 0)
        }
      };
    } catch (error) {
      throw new Error(`Hugging Face embedding failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
