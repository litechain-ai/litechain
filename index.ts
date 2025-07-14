import { createOpenAIClient } from "./src/llm/openai";
import { createGroqClient } from "./src/llm/groq";
import { createGeminiClient } from "./src/llm/gemini";
import { createClaudeClient } from "./src/llm/claude";
import { LLMBase, LLMConfig } from "./src/llm/base";
import { 
  ConnectionType, 
  ConnectionRoutes, 
  EnhancedLLMState, 
  TransferResponse, 
  ConversationFlowEntry 
} from "./src/types/llm";
import { BudgetConfig, BudgetTracker } from "./src/types/budget";
import { EmbeddingConfig } from "./src/types/embeddings";

/**
 * Enhanced litechain configuration interface
 */
export interface LitechainConfig {
  // LLM Configuration
  provider?: 'openai' | 'groq' | 'gemini' | 'claude';
  model: string;
  apiKey: string;
  
  // Budget tracking configuration
  budget?: BudgetConfig;
  
  // Embedding configuration
  embeddings?: EmbeddingConfig | ((text: string) => Promise<number[]>) | ((texts: string[]) => Promise<number[][]>);
  
  // Other configurations
  systemPrompt?: string;
  tools?: any[];
  /**
   * Maximum number of messages to keep in context window (history). If not set, unlimited.
   */
  maxContextWindow?: number;
}

/**
 * Create a litechain instance with enhanced configuration
 */
function createLitechain(config: LitechainConfig): LLMBase {
  const { provider = 'openai', model, apiKey, budget, embeddings, systemPrompt, tools, maxContextWindow } = config;
  
  // Prepare LLM configuration
  const llmConfig: LLMConfig = {};
  
  // Set up budget tracking
  if (budget) {
    llmConfig.budgetConfig = budget;
  }
  
  // Set up embeddings
  if (embeddings) {
    if (typeof embeddings === 'function') {
      // Handle custom embedding function
      llmConfig.embeddingConfig = {
        provider: 'custom',
        embed: async (texts: string[]) => {
          // Check if it's single text function or batch function
          if (texts.length === 1) {
            try {
              // Try as single text function first
              const result = await (embeddings as any)(texts[0]);
              if (Array.isArray(result) && typeof result[0] === 'number') {
                return [result];
              }
            } catch (e) {
              // Fall through to batch function
            }
          }
          // Use as batch function
          return await (embeddings as any)(texts);
        }
      };
    } else {
      // Handle provider-based embeddings
      llmConfig.embeddingConfig = embeddings;
    }
  }
  // Pass maxContextWindow only
  if (typeof maxContextWindow === 'number') {
    llmConfig.maxContextWindow = maxContextWindow;
  }
  
  // Create the LLM instance based on provider
  let llmInstance: LLMBase;
  
  switch (provider) {
    case 'openai':
      llmInstance = createOpenAIClient({ apiKey, model, tools, config: llmConfig });
      break;
    case 'groq':
      llmInstance = createGroqClient({ apiKey, model, tools, config: llmConfig });
      break;
    case 'gemini':
      llmInstance = createGeminiClient({ apiKey, model, tools, config: llmConfig });
      break;
    case 'claude':
      llmInstance = createClaudeClient({ apiKey, model, tools, config: llmConfig });
      break;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
  
  // Set system prompt if provided
  if (systemPrompt) {
    llmInstance.systemprompt = systemPrompt;
  }
  
  return llmInstance;
}

// Main litechain object with both old and new API
const litechain = Object.assign(createLitechain, {
  llm: {
    openai: createOpenAIClient,
    groq: createGroqClient,
    gemini: createGeminiClient,
    claude: createClaudeClient,
  }
});

export default litechain;

// Export the enhanced litechain function  
export { createLitechain as litechain };

// Export types for external use
export {
  LLMBase,
  ConnectionType,
  ConnectionRoutes,
  EnhancedLLMState,
  TransferResponse,
  ConversationFlowEntry
};

// Export budget tracking types
export type { 
  BudgetConfig, 
  UsageStats, 
  TokenUsage, 
  BudgetTracker 
} from "./src/types/budget";

// Export embedding types
export type { 
  EmbeddingConfig, 
  EmbeddingProvider, 
  EmbeddingVector,
  OpenAIEmbeddingConfig,
  CohereEmbeddingConfig,
  HuggingFaceEmbeddingConfig,
  CustomEmbeddingConfig
} from "./src/types/embeddings";

// Export LLM config type
export type { LLMConfig } from "./src/llm/base";
