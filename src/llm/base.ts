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
  variables?: Record<string, string>;
}

export interface LLMConfig {
  memoryConfig?: MemoryConfig;
  budgetConfig?: BudgetConfig;
  embeddingConfig?: EmbeddingConfig;
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
  public state: EnhancedLLMState;
  public systemprompt: string = "";
  public tools: Tool[] = [];
  public connections: ConnectionRoutes = {};
  public memory?: Memory;
  public budgetTracker?: BudgetTracker;
  public embeddingProvider?: EmbeddingProvider;

  constructor(public name: string, public model: string, config?: LLMConfig) {
    this.state = {
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
      this.memory = createMemory(config.memoryConfig, this.state.thread_id, this.embeddingProvider);
    }
  }

  protected async _invoke(prompt: string): Promise<string> {
    throw new Error("Method not implemented");
  }

  protected async _invokeStream(prompt: string, options?: { onFunctionCall?: (functionCall: { name: string; args: Record<string, any> }) => void }): Promise<AsyncIterableIterator<StreamChunk>> {
    // Default implementation: fallback to non-streaming
    const response = await this._invoke(prompt);
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

  /**
   * Handle transfer or escalation to connected LLM/function
   */
  protected async handleTransfer(message: string, target: string, type: 'transfer' | 'escalate'): Promise<string> {
    const connection = this.connections[target];
    
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
    this.state.transfers.push(transfer);

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
        this.state.conversation_flow.push(...connection.state.conversation_flow);
      }

      // Record the conversation flow entry
      const flowEntry: ConversationFlowEntry = {
        llmName: typeof connection === 'function' ? `function:${target}` : connection.name,
        message,
        response,
        timestamp: new Date(),
        transferTarget: target
      };
      this.state.conversation_flow.push(flowEntry);

      return response;
    } catch (error) {
      console.error(`Error in ${type} to ${target}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `[ERROR: Failed to ${type} to ${target} - ${errorMessage}]`;
    }
  }

  /**
   * Enhanced invoke method with chaining capabilities
   */
  async invoke(message: string, variables: Record<string, string> = {}): Promise<string> {
    
    const finalSystem = interpolatePrompt(this.systemprompt, variables);
    const userPrompt = interpolatePrompt(message, variables);

    if (this.state.history.length === 0 && this.systemprompt) {
      this.state.history.push({ role: "system", content: finalSystem });
    }

    this.state.history.push({ role: "user", content: userPrompt });

    // Get initial response from this LLM (this is where tool calling happens)
    let response = await this._invoke(userPrompt);
    this.state.history.push({ role: "assistant", content: response });

    // Record initial conversation flow entry
    const initialFlowEntry: ConversationFlowEntry = {
      llmName: this.name,
      message: userPrompt,
      response,
      timestamp: new Date()
    };
    this.state.conversation_flow.push(initialFlowEntry);

    // Check for transfer patterns
    const transferMatch = response.match(/\[TRANSFER:(\w+)\]/);
    const escalateMatch = response.match(/\[ESCALATE:(\w+)\]/);

    if (transferMatch) {
      const target = transferMatch[1];
      response = await this.handleTransfer(message, target, 'transfer');
    } else if (escalateMatch) {
      const target = escalateMatch[1];
      response = await this.handleTransfer(message, target, 'escalate');
    }

    return response;
  }

  /**
   * Main run method with streaming and memory support
   */
  async run(message: string, options: RunOptions = {}): Promise<string> {
    const { variables = {}, stream = false } = options;
    
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
    
    // Prepare the full prompt with memory context
    const fullPrompt = memoryContext 
      ? `Context from memory:\n${memoryContext}\n\nUser: ${userPrompt}`
      : userPrompt;

    if (this.state.history.length === 0 && this.systemprompt) {
      this.state.history.push({ role: "system", content: finalSystem });
    }

    this.state.history.push({ role: "user", content: fullPrompt });

    let response: string;
    
    if (stream) {
      // Handle streaming
      const streamIterator = await this._invokeStream(fullPrompt, { onFunctionCall: options.onFunctionCall });
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
      response = await this._invoke(fullPrompt);
    }

    this.state.history.push({ role: "assistant", content: response });

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
    this.state.conversation_flow.push(flowEntry);

    // Check for transfer patterns
    const transferMatch = response.match(/\[TRANSFER:(\w+)\]/);
    const escalateMatch = response.match(/\[ESCALATE:(\w+)\]/);

    if (transferMatch) {
      const target = transferMatch[1];
      response = await this.handleTransfer(message, target, 'transfer');
    } else if (escalateMatch) {
      const target = escalateMatch[1];
      response = await this.handleTransfer(message, target, 'escalate');
    }

    return response;
  }

  /**
   * Create a streaming response
   */
  async stream(message: string, options: StreamOptions = {}): Promise<StreamResponse> {
    const streamOptions: RunOptions = {
      ...options,
      stream: true
    };

    const streamPromise = this._createStreamPromise(message, streamOptions);
    return createStreamResponse(streamPromise, options);
  }

  private async _createStreamPromise(message: string, options: RunOptions): Promise<AsyncIterableIterator<StreamChunk>> {
    // This is a simplified version - in practice you'd want to handle memory/context here too
    const finalPrompt = interpolatePrompt(message, options.variables || {});
    return this._invokeStream(finalPrompt, { onFunctionCall: options.onFunctionCall });
  }

  /**
   * Get conversation flow for debugging
   */
  getConversationFlow(): ConversationFlowEntry[] {
    return this.state.conversation_flow;
  }

  /**
   * Get transfer history for debugging
   */
  getTransferHistory(): TransferResponse[] {
    return this.state.transfers;
  }

  /**
   * Clear conversation state
   */
  clearState(): void {
    this.state = {
      thread_id: uuidv4(),
      history: [],
      conversation_flow: [],
      transfers: [],
      current_llm: this.name,
    };
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
}
