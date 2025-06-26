import { createOpenAIClient } from "./llm/openai";
import { createGroqClient } from "./llm/groq";
import { createGeminiClient } from "./llm/gemini";
import { createClaudeClient } from "./llm/claude";
import { LLMBase } from "./llm/base";
import { 
  ConnectionType, 
  ConnectionRoutes, 
  EnhancedLLMState, 
  TransferResponse, 
  ConversationFlowEntry 
} from "./types/llm";

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
