import { interpolatePrompt } from "../utils/prompt";
import { v4 as uuidv4 } from "uuid";
import { ConnectionRoutes, EnhancedLLMState, TransferResponse, ConversationFlowEntry } from "../types/llm";

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

  constructor(public name: string, public model: string) {
    this.state = {
      thread_id: uuidv4(),
      history: [],
      conversation_flow: [],
      transfers: [],
      current_llm: this.name,
    };
  }

  protected async _invoke(prompt: string): Promise<string> {
    throw new Error("Method not implemented");
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

    // Get initial response from this LLM
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
}
