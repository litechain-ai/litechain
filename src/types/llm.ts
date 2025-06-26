import { LLMBase } from "../llm/base";

// Connection types - can be either an LLM instance or a function
export type ConnectionType = LLMBase | ((message: string) => Promise<string> | string);

// Transfer/Escalation response structure
export interface TransferResponse {
  type: 'transfer' | 'escalate';
  target: string;
  originalResponse: string;
  timestamp: Date;
}

// Conversation flow entry
export interface ConversationFlowEntry {
  llmName: string;
  message: string;
  response: string;
  timestamp: Date;
  transferTarget?: string;
}

// Enhanced LLM state with chaining capabilities
export interface EnhancedLLMState {
  thread_id: string;
  history: Array<{ role: "user" | "assistant" | "system"; content: string } | { role: "tool"; tool_call_id: string; content: string }>;
  conversation_flow: ConversationFlowEntry[];
  transfers: TransferResponse[];
  current_llm: string;
}

// Connection routes configuration
export interface ConnectionRoutes {
  [key: string]: ConnectionType;
}
