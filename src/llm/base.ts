import { interpolatePrompt } from "../utils/prompt";
import { v4 as uuidv4 } from "uuid";
import { ConnectionRoutes, EnhancedLLMState, TransferResponse, ConversationFlowEntry } from "../types/llm";
import { StreamChunk, StreamOptions, StreamResponse } from "../types/streaming";
import { Memory, MemoryConfig, MemoryEntry } from "../types/memory";
import { createMemory } from "../memory/factory";
import { createStreamResponse, StreamManager } from "../utils/streaming";
import { BudgetConfig, BudgetTracker, UsageStats, TokenUsage } from "../types/budget";
import { EmbeddingConfig, EmbeddingProvider } from "../types/embeddings";
import { createEmbeddingProvider } from "../embeddings/factory";

export interface RunOptions {
  stream?: boolean;
  onChunk?: (chunk: StreamChunk) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: Error) => void;
  onFunctionCall?: (functionCall: { name: string; args: Record<string, any> }) => void;
  onFunctionCallFinish?: (functionCall: { name: string; args: Record<string, any>; response: string }) => void;
  variables?: Record<string, string>;
}

export interface LLMConfig {
  memoryConfig?: MemoryConfig;
  budgetConfig?: BudgetConfig;
  embeddingConfig?: EmbeddingConfig;
  maxContextWindow?: number; // max number of messages to keep in history
}

type LLMMessage =
  | { role: "user" | "assistant" | "system"; content: string }
  | { role: "tool"; tool_call_id: string; content: string };

type LLMState = {
  thread_id: string;
  history: LLMMessage[];
};

export type Tool<P = Record<string, any>> = {
  name: string;
  description: string;
  parameters: P;
  execute: (parameters: P) => Promise<string>;
}

export class LLMBase {
  private conversationStates: Record<string, EnhancedLLMState> = {};
  public systemprompt: string = "";
  public tools: Tool[] = [];
  public connections: ConnectionRoutes = {};
  public memory?: Memory;
  public budgetTracker?: BudgetTracker;
  public embeddingProvider?: EmbeddingProvider;
  public maxContextWindow?: number; // keep


  constructor(public name: string, public model: string, config?: LLMConfig) {
    this.maxContextWindow = config?.maxContextWindow;
    // Initialize default conversation state
    this.conversationStates["default"] = {
      thread_id: uuidv4(),
      history: [],
      conversation_flow: [],
      transfers: [],
      current_llm: this.name,
    };
    
    // Initialize budget tracking if configured
    if (config?.budgetConfig) {
      this.budgetTracker = new BudgetTracker(config.budgetConfig);
    }
    
    // Initialize embedding provider if configured
    if (config?.embeddingConfig) {
      this.embeddingProvider = createEmbeddingProvider(config.embeddingConfig);
    }
    
    // Initialize memory if configured
    if (config?.memoryConfig) {
      this.memory = createMemory(config.memoryConfig, this.conversationStates["default"].thread_id, this.embeddingProvider);
    }
  }

  protected async _invoke(prompt: string, conversationId: string = "default"): Promise<string> {
    throw new Error("Method not implemented");
  }

  protected async _invokeStream(prompt: string, options?: { onFunctionCall?: (functionCall: { name: string; args: Record<string, any> }) => void; onFunctionCallFinish?: (functionCall: { name: string; args: Record<string, any>; response: string }) => void }, conversationId: string = "default"): Promise<AsyncIterableIterator<StreamChunk>> {
    // Default implementation: fallback to non-streaming
    const response = await this._invoke(prompt, conversationId);
    const manager = new StreamManager();
    
    async function* fallbackStream() {
      yield manager.processChunk(response);
      yield manager.complete();
    }
    
    return fallbackStream();
  }

  addTool(tool: Tool) {
    this.tools.push(tool);
  }

  /**
   * Connect this LLM to other LLMs or functions for routing
   */
  connect(routes: ConnectionRoutes): void {
    this.connections = { ...this.connections, ...routes };
  }

  protected getOrCreateState(conversationId: string = "default"): EnhancedLLMState {
    if (!this.conversationStates[conversationId]) {
      this.conversationStates[conversationId] = {
        thread_id: uuidv4(),
        history: [],
        conversation_flow: [],
        transfers: [],
        current_llm: this.name,
      };
    }
    return this.conversationStates[conversationId];
  }

  /**
   * Handle transfer or escalation to connected LLM/function
   */
  protected async handleTransfer(message: string, target: string, type: 'transfer' | 'escalate', conversationId: string = "default"): Promise<string> {
    const connection = this.connections[target];
    const state = this.getOrCreateState(conversationId);
    
    if (!connection) {
      console.warn(`No connection found for target: ${target}`);
      return `[ERROR: No connection found for ${target}]`;
    }

    // Record the transfer
    const transfer: TransferResponse = {
      type,
      target,
      originalResponse: '',
      timestamp: new Date()
    };
    state.transfers.push(transfer);

    try {
      let response: string;
      
      if (typeof connection === 'function') {
        // Handle function connection
        response = await connection(message);
      } else {
        // Handle LLM connection
        // Create a fresh message for the connected LLM to avoid tool call issues
        const cleanMessage = message.replace(/\[TRANSFER:\w+\]|\[ESCALATE:\w+\]/g, '').trim();
        response = await connection.invoke(cleanMessage);
        
        // Merge conversation flow from connected LLM
        state.conversation_flow.push(...connection.getConversationFlow());
      }

      // Record the conversation flow entry
      const flowEntry: ConversationFlowEntry = {
        llmName: typeof connection === 'function' ? `function:${target}` : connection.name,
        message,
        response,
        timestamp: new Date(),
        transferTarget: target
      };
      state.conversation_flow.push(flowEntry);

      return response;
    } catch (error) {
      console.error(`Error in ${type} to ${target}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `[ERROR: Failed to ${type} to ${target} - ${errorMessage}]`;
    }
  }

  /**
   * Generate a response from the LLM. Stateless by default unless conversationId is provided in options.
   * @param message The user prompt
   * @param variables Optional variables for prompt interpolation
   * @param options Optional object: { conversationId, stateless }
   *   - If stateless is true, no context/history is used or updated.
   *   - If conversationId is provided (and stateless is not true), stateful mode is used.
   */
  async invoke(
    message: string,
    variables?: Record<string, string>,
    options?: { conversationId?: string; stateless?: boolean } | string
  ): Promise<string> {
    // Backward compatibility: if options is a string, treat as conversationId
    let conversationId: string | undefined = undefined;
    let stateless = false;
    if (typeof options === "string") {
      conversationId = options;
    } else if (typeof options === "object" && options !== null) {
      conversationId = options.conversationId;
      stateless = !!options.stateless;
    }
    // If stateless, do not use or update any state/history
    if (stateless || !conversationId) {
      const finalSystem = interpolatePrompt(this.systemprompt, variables || {});
      const userPrompt = interpolatePrompt(message, variables || {});
      // Optionally include system prompt in stateless mode
      let prompt = userPrompt;
      if (this.systemprompt) {
        prompt = `${finalSystem}\n${userPrompt}`;
      }
      let response = await this._invoke(prompt, "stateless");
      // Check for transfer/escalate patterns (stateless transfer is allowed)
      const transferMatch = response.match(/\[TRANSFER:(\w+)\]/);
      const escalateMatch = response.match(/\[ESCALATE:(\w+)\]/);
      if (transferMatch) {
        const target = transferMatch[1];
        response = await this.handleTransfer(message, target, 'transfer', "stateless");
      } else if (escalateMatch) {
        const target = escalateMatch[1];
        response = await this.handleTransfer(message, target, 'escalate', "stateless");
      }
      return response;
    }
    // Stateful mode (default if conversationId is provided)
    const state = this.getOrCreateState(conversationId);
    const finalSystem = interpolatePrompt(this.systemprompt, variables || {});
    const userPrompt = interpolatePrompt(message, variables || {});
    // --- Ensure system prompt is always up-to-date in history ---
    if (this.systemprompt) {
      if (state.history.length > 0 && state.history[0].role === "system") {
        // Update the first system message
        state.history[0].content = finalSystem;
      } else {
        // Insert system prompt at the start
        state.history.unshift({ role: "system", content: finalSystem });
      }
    }
    // --- End system prompt update logic ---
    state.history.push({ role: "user", content: userPrompt });
    // No prune here
    // Get initial response from this LLM (this is where tool calling happens)
    let response = await this._invoke(userPrompt, conversationId);
    state.history.push({ role: "assistant", content: response });
    await this.pruneHistoryIfNeeded(state); // Only after assistant
    // Record initial conversation flow entry
    const initialFlowEntry: ConversationFlowEntry = {
      llmName: this.name,
      message: userPrompt,
      response,
      timestamp: new Date()
    };
    state.conversation_flow.push(initialFlowEntry);
    // Check for transfer patterns
    const transferMatch = response.match(/\[TRANSFER:(\w+)\]/);
    const escalateMatch = response.match(/\[ESCALATE:(\w+)\]/);
    if (transferMatch) {
      const target = transferMatch[1];
      response = await this.handleTransfer(message, target, 'transfer', conversationId);
    } else if (escalateMatch) {
      const target = escalateMatch[1];
      response = await this.handleTransfer(message, target, 'escalate', conversationId);
    }
    return response;
  }

  /**
   * Main run method with streaming and memory support
   */
  async run(message: string, options: RunOptions = {}, conversationId: string = "default"): Promise<string> {
    const { variables = {}, stream = false } = options;
    const state = this.getOrCreateState(conversationId);
    
    // Load memory context if available
    let memoryContext = '';
    if (this.memory) {
      const memoryEntries = await this.memory.retrieve(message, 5);
      if (memoryEntries.length > 0) {
        memoryContext = memoryEntries
          .map(entry => `[${entry.timestamp.toLocaleString()}] ${entry.content}`)
          .join('\n');
      }
    }

    const finalSystem = interpolatePrompt(this.systemprompt, variables);
    const userPrompt = interpolatePrompt(message, variables);
    
    // Prepare the full prompt with memory context only
    let fullPrompt = userPrompt;
    if (memoryContext) {
      fullPrompt = `Context from memory:\n${memoryContext}\n\nUser: ${userPrompt}`;
    }

    // --- Ensure system prompt is always up-to-date in history ---
    if (this.systemprompt) {
      if (state.history.length > 0 && state.history[0].role === "system") {
        // Update the first system message
        state.history[0].content = finalSystem;
      } else {
        // Insert system prompt at the start
        state.history.unshift({ role: "system", content: finalSystem });
      }
    }
    // --- End system prompt update logic ---

    state.history.push({ role: "user", content: fullPrompt });
    // No prune here

    let response: string;
    
    if (stream) {
      // Handle streaming
      const streamIterator = await this._invokeStream(fullPrompt, { onFunctionCall: options.onFunctionCall, onFunctionCallFinish: options.onFunctionCallFinish }, conversationId);
      let fullContent = '';
      
      for await (const chunk of streamIterator) {
        if (options.onChunk) {
          options.onChunk(chunk);
        }
        fullContent = chunk.content;
        
        if (chunk.isComplete) {
          break;
        }
      }
      
      response = fullContent;
      
      if (options.onComplete) {
        options.onComplete(response);
      }
    } else {
      // Handle non-streaming
      response = await this._invoke(fullPrompt, conversationId);
    }

    state.history.push({ role: "assistant", content: response });
    await this.pruneHistoryIfNeeded(state); // Only after assistant

    // Store in memory if available
    if (this.memory) {
      const userEntry: MemoryEntry = {
        id: uuidv4(),
        content: userPrompt,
        timestamp: new Date(),
        metadata: { role: 'user', llm: this.name }
      };
      
      const assistantEntry: MemoryEntry = {
        id: uuidv4(),
        content: response,
        timestamp: new Date(),
        metadata: { role: 'assistant', llm: this.name }
      };
      
      await Promise.all([
        this.memory.store(userEntry),
        this.memory.store(assistantEntry)
      ]);
    }

    // Record conversation flow entry
    const flowEntry: ConversationFlowEntry = {
      llmName: this.name,
      message: userPrompt,
      response,
      timestamp: new Date()
    };
    state.conversation_flow.push(flowEntry);

    // Check for transfer patterns
    const transferMatch = response.match(/\[TRANSFER:(\w+)\]/);
    const escalateMatch = response.match(/\[ESCALATE:(\w+)\]/);

    if (transferMatch) {
      const target = transferMatch[1];
      response = await this.handleTransfer(message, target, 'transfer', conversationId);
    } else if (escalateMatch) {
      const target = escalateMatch[1];
      response = await this.handleTransfer(message, target, 'escalate', conversationId);
    }

    return response;
  }

  /**
   * Create a streaming response
   */
  async stream(message: string, options: StreamOptions = {}, conversationId: string = "default"): Promise<StreamResponse> {
    const streamOptions: RunOptions = {
      ...options,
      stream: true
    };

    const streamPromise = this._createStreamPromise(message, streamOptions, conversationId);
    return createStreamResponse(streamPromise, options);
  }

  private async _createStreamPromise(message: string, options: RunOptions, conversationId: string = "default"): Promise<AsyncIterableIterator<StreamChunk>> {
    // This is a simplified version - in practice you'd want to handle memory/context here too
    const finalPrompt = interpolatePrompt(message, options.variables || {});
    return this._invokeStream(finalPrompt, { onFunctionCall: options.onFunctionCall, onFunctionCallFinish: options.onFunctionCallFinish }, conversationId);
  }

  /**
   * Get conversation flow for debugging
   */
  getConversationFlow(conversationId: string = "default"): ConversationFlowEntry[] {
    return this.getOrCreateState(conversationId).conversation_flow;
  }

  /**
   * Get transfer history for debugging
   */
  getTransferHistory(conversationId: string = "default"): TransferResponse[] {
    return this.getOrCreateState(conversationId).transfers;
  }

  /**
   * Clear conversation state
   */
  clearState(conversationId: string = "default"): void {
    this.conversationStates[conversationId] = {
      thread_id: uuidv4(),
      history: [],
      conversation_flow: [],
      transfers: [],
      current_llm: this.name,
    };
  }

  /**
   * Set the conversation state for a given conversationId
   */
  setState(conversationId: string, state: {
    thread_id: string;
    history: Array<{ role: string; content: string; tool_call_id?: string }>;
    conversation_flow: Array<{
      llmName: string;
      message: string;
      response: string;
      timestamp: Date;
      transferTarget?: string;
    }>;
    transfers: Array<{
      type: string;
      target: string;
      originalResponse: string;
      timestamp: Date;
    }>;
    current_llm: string;
  }): void {
    this.conversationStates[conversationId] = state as EnhancedLLMState;
  }

  /**
   * Get the conversation state for a given conversationId
   */
  getState(conversationId: string = "default"): EnhancedLLMState {
    return this.getOrCreateState(conversationId);
  }

  /**
   * Record token usage for budget tracking
   */
  protected recordTokenUsage(tokenUsage: TokenUsage): void {
    if (this.budgetTracker) {
      this.budgetTracker.recordUsage(this.model, tokenUsage);
    }
  }

  /**
   * Get current usage statistics
   */
  getUsage(): UsageStats | null {
    return this.budgetTracker ? this.budgetTracker.getUsage() : null;
  }

  /**
   * Update budget configuration
   */
  updateBudget(config: Partial<BudgetConfig>): void {
    if (this.budgetTracker) {
      this.budgetTracker.updateConfig(config);
    } else {
      this.budgetTracker = new BudgetTracker(config);
    }
  }

  /**
   * Set or update embedding provider
   */
  setEmbeddingProvider(provider: EmbeddingProvider): void {
    this.embeddingProvider = provider;
    if (this.memory && 'setEmbeddingProvider' in this.memory) {
      (this.memory as any).setEmbeddingProvider(provider);
    }
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): number | null {
    return this.budgetTracker ? this.budgetTracker.getRemainingBudget() : null;
  }

  /**
   * Reset usage statistics
   */
  resetUsage(): void {
    if (this.budgetTracker) {
      this.budgetTracker.reset();
    }
  }

  // Make pruneHistoryIfNeeded async and use LLM for summarisation
  private async pruneHistoryIfNeeded(state: EnhancedLLMState) {
    if (this.maxContextWindow && state.history.length > this.maxContextWindow) {
      const numToPrune = state.history.length - this.maxContextWindow;
      state.history.splice(0, numToPrune);
    }
  }

}
