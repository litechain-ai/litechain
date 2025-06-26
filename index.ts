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

export default {
  llm: {
    openai: createOpenAIClient,
    groq: createGroqClient,
    gemini: createGeminiClient,
    claude: createClaudeClient,
  }
};

// Export types for external use
export {
  LLMBase,
  ConnectionType,
  ConnectionRoutes,
  EnhancedLLMState,
  TransferResponse,
  ConversationFlowEntry
};
