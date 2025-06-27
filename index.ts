import { createOpenAIClient } from "./src/llm/openai";
import { createGroqClient } from "./src/llm/groq";
import { createGeminiClient } from "./src/llm/gemini";
import { createClaudeClient } from "./src/llm/claude";
import { LLMBase } from "./src/llm/base";
import { 
  ConnectionType, 
  ConnectionRoutes, 
  EnhancedLLMState, 
  TransferResponse, 
  ConversationFlowEntry 
} from "./src/types/llm";

// Main litechain object with simplified API
const litechain = {
  llm: {
    openai: createOpenAIClient,
    groq: createGroqClient,
    gemini: createGeminiClient,
    claude: createClaudeClient,
  }
};

export default litechain;

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
