/**
 * Budget tracking types for Litechain
 */

export interface UsageStats {
  tokens: number;
  cost: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

export interface BudgetConfig {
  limit?: number; // USD limit
  onExceeded?: (usage: UsageStats) => void;
  trackTokens?: boolean; // Default: true
  trackCost?: boolean; // Default: true
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ModelPricing {
  inputTokenPrice: number; // Price per 1K tokens
  outputTokenPrice: number; // Price per 1K tokens
}

// Known model pricing (per 1K tokens in USD)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI GPT-4 models
  'gpt-4': { inputTokenPrice: 0.03, outputTokenPrice: 0.06 },
  'gpt-4-turbo': { inputTokenPrice: 0.01, outputTokenPrice: 0.03 },
  'gpt-4o': { inputTokenPrice: 0.005, outputTokenPrice: 0.015 },
  'gpt-4o-mini': { inputTokenPrice: 0.00015, outputTokenPrice: 0.0006 },
  
  // OpenAI GPT-3.5 models
  'gpt-3.5-turbo': { inputTokenPrice: 0.0015, outputTokenPrice: 0.002 },
  'gpt-3.5-turbo-instruct': { inputTokenPrice: 0.0015, outputTokenPrice: 0.002 },
  
  // Anthropic Claude models
  'claude-3-opus-20240229': { inputTokenPrice: 0.015, outputTokenPrice: 0.075 },
  'claude-3-sonnet-20240229': { inputTokenPrice: 0.003, outputTokenPrice: 0.015 },
  'claude-3-haiku-20240307': { inputTokenPrice: 0.00025, outputTokenPrice: 0.00125 },
  'claude-3-5-sonnet-20241022': { inputTokenPrice: 0.003, outputTokenPrice: 0.015 },
  
  // Google Gemini models (estimated)
  'gemini-pro': { inputTokenPrice: 0.0005, outputTokenPrice: 0.0015 },
  'gemini-1.5-pro': { inputTokenPrice: 0.0035, outputTokenPrice: 0.0105 },
  'gemini-1.5-flash': { inputTokenPrice: 0.00035, outputTokenPrice: 0.00105 },
  
  // Groq models (estimated - they often offer free tiers)
  'mixtral-8x7b-32768': { inputTokenPrice: 0.00027, outputTokenPrice: 0.00027 },
  'llama2-70b-4096': { inputTokenPrice: 0.0007, outputTokenPrice: 0.0008 },
  'gemma-7b-it': { inputTokenPrice: 0.0001, outputTokenPrice: 0.0001 },
};

export class BudgetTracker {
  private usage: UsageStats;
  private config: BudgetConfig;

  constructor(config: BudgetConfig = {}) {
    this.config = {
      trackTokens: true,
      trackCost: true,
      ...config
    };
    
    this.usage = {
      tokens: 0,
      cost: 0,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0
    };
  }

  /**
   * Record token usage and calculate cost
   */
  recordUsage(model: string, tokenUsage: TokenUsage): number {
    if (!this.config.trackTokens && !this.config.trackCost) {
      return 0;
    }

    this.usage.calls++;
    this.usage.inputTokens += tokenUsage.inputTokens;
    this.usage.outputTokens += tokenUsage.outputTokens;
    this.usage.tokens += tokenUsage.totalTokens;

    let costIncrement = 0;
    if (this.config.trackCost) {
      const pricing = MODEL_PRICING[model];
      if (pricing) {
        const inputCost = (tokenUsage.inputTokens / 1000) * pricing.inputTokenPrice;
        const outputCost = (tokenUsage.outputTokens / 1000) * pricing.outputTokenPrice;
        costIncrement = inputCost + outputCost;
        this.usage.cost += costIncrement;
      }
    }

    // Check budget limit
    if (this.config.limit && this.usage.cost > this.config.limit) {
      if (this.config.onExceeded) {
        this.config.onExceeded({ ...this.usage });
      } else {
        throw new Error(
          `Budget limit exceeded. Limit: $${this.config.limit}, Current usage: $${this.usage.cost.toFixed(4)}`
        );
      }
    }

    return costIncrement;
  }

  /**
   * Get current usage statistics
   */
  getUsage(): UsageStats {
    return { ...this.usage };
  }

  /**
   * Reset usage statistics
   */
  reset(): void {
    this.usage = {
      tokens: 0,
      cost: 0,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0
    };
  }

  /**
   * Update budget configuration
   */
  updateConfig(config: Partial<BudgetConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if budget limit would be exceeded by a potential cost
   */
  wouldExceedBudget(additionalCost: number): boolean {
    if (!this.config.limit) return false;
    return (this.usage.cost + additionalCost) > this.config.limit;
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): number | null {
    if (!this.config.limit) return null;
    return Math.max(0, this.config.limit - this.usage.cost);
  }
}
