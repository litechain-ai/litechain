import Anthropic from "@anthropic-ai/sdk";
import { LLMBase, LLMConfig } from "./base";
import { StreamChunk } from "../types/streaming";
import { StreamManager } from "../utils/streaming";

class ClaudeClient extends LLMBase {
    private anthropic: Anthropic;

    constructor(apiKey: string, model: string, tools?: any[], config?: LLMConfig) {
        super("claude", model, config);
        this.anthropic = new Anthropic({ apiKey });
        if (tools) {
            tools.forEach((tool) => {
                this.addTool(tool);
            });
        }
    }

    protected async _invoke(prompt: string): Promise<string> {
        let currentHistory = [...this.state.history];
        // Only include 'user' and 'assistant' roles for Claude
        const messages = currentHistory
            .filter((msg) => msg.role === "user" || msg.role === "assistant")
            .map((msg) => ({ role: msg.role as "user" | "assistant", content: msg.content }));
        const res = await this.anthropic.messages.create({
            model: this.model,
            max_tokens: 1024,
            messages,
        });
        // Extract text from ContentBlock(s)
        const text = Array.isArray(res.content)
            ? res.content.map((block: any) => typeof block.text === "string" ? block.text : "").join("")
            : "";
        // Record token usage for budget tracking
        if (res.usage && this.budgetTracker) {
            this.recordTokenUsage({
                inputTokens: res.usage.input_tokens,
                outputTokens: res.usage.output_tokens,
                totalTokens: res.usage.input_tokens + res.usage.output_tokens
            });
        }
        return text;
    }

    protected async _invokeStream(prompt: string, options?: { onFunctionCall?: (functionCall: { name: string; args: Record<string, any> }) => void }): Promise<AsyncIterableIterator<StreamChunk>> {
        let currentHistory = [...this.state.history];
        
        // Create tool descriptions for system prompt
        const toolDescriptions = this.tools.map((tool) => {
            const params = Object.entries(tool.parameters)
                .map(([key, value]) => `${key} (${value.type}): ${value.description}`)
                .join(', ');
            return `- ${tool.name}: ${tool.description}. Parameters: ${params}`;
        }).join('\n');

        // Add system instruction for tool usage
        if (this.tools.length > 0) {
            const toolInstruction = `You have access to the following tools. When you need to use a tool, format your response as follows:

AVAILABLE TOOLS:
${toolDescriptions}

TOOL USAGE FORMAT:
When you need to use a tool, write: [TOOL_CALL:tool_name:{"param1": "value1", "param2": "value2"}]

Example: [TOOL_CALL:fetchDietPlan:{"uid": "user123"}]

After the tool call, continue with your response based on the tool result.`;
            
            currentHistory.unshift({
                role: "user",
                content: toolInstruction
            });
        }

        // Only include 'user' and 'assistant' roles for Claude
        const messages = currentHistory
            .filter((msg) => msg.role === "user" || msg.role === "assistant")
            .map((msg) => ({ role: msg.role as "user" | "assistant", content: msg.content }));

        const manager = new StreamManager();
        let inputTokens = 0;
        let outputTokens = 0;
        const model = this.model;
        const budgetTracker = this.budgetTracker;
        const recordTokenUsage = this.recordTokenUsage.bind(this);
        const tools = this.tools;
        const state = this.state;
        const anthropic = this.anthropic;

        // Estimate input tokens
        inputTokens = Math.ceil(JSON.stringify(messages).length / 4);

        async function* streamGenerator() {
            try {
                let currentContents = [...messages];
                let accumulatedText = '';
                let toolCallBuffer = '';
                let inToolCall = false;

                while (true) {
                    const stream = await anthropic.messages.create({
                        model: model,
                        max_tokens: 1024,
                        messages: currentContents,
                        stream: true,
                    });

                    let hasToolCalls = false;
                    let toolCalls: any[] = [];
                    
                    for await (const chunk of stream) {
                        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                            const chunkText = chunk.delta.text;
                            
                            if (chunkText) {
                                outputTokens += Math.ceil(chunkText.length / 4);
                                
                                // Check for tool call patterns in the text
                                if (!inToolCall && (chunkText.includes('[TOOL_CALL:') || chunkText.includes('['))) {
                                    inToolCall = true;
                                    toolCallBuffer = chunkText;
                                    continue;
                                }
                                
                                if (inToolCall) {
                                    toolCallBuffer += chunkText;
                                    
                                    // Check if tool call is complete
                                    if (toolCallBuffer.includes(']') && toolCallBuffer.includes('[TOOL_CALL:')) {
                                        inToolCall = false;
                                        hasToolCalls = true;
                                        
                                        // Parse the tool call
                                        const toolCallMatch = toolCallBuffer.match(/\[TOOL_CALL:([^:]+):(\{[^}]+\})\]/);
                                        if (toolCallMatch) {
                                            const toolName = toolCallMatch[1].trim();
                                            const argsString = toolCallMatch[2].trim();
                                            
                                            try {
                                                const args = JSON.parse(argsString);
                                                toolCalls.push({ name: toolName, args });
                                            } catch (parseError) {
                                                console.error("Failed to parse tool args:", parseError);
                                            }
                                        } else {
                                            // Try a more flexible regex
                                            const flexibleMatch = toolCallBuffer.match(/\[TOOL_CALL:([^:]+):(.+)\]/);
                                            if (flexibleMatch) {
                                                const toolName = flexibleMatch[1].trim();
                                                const argsString = flexibleMatch[2].trim();
                                                
                                                try {
                                                    const args = JSON.parse(argsString);
                                                    toolCalls.push({ name: toolName, args });
                                                } catch (parseError) {
                                                    console.error("Failed to parse tool args with flexible regex:", parseError);
                                                }
                                            }
                                        }
                                        
                                        toolCallBuffer = '';
                                    }
                                    continue;
                                }
                                
                                // Regular text chunk
                                accumulatedText += chunkText;
                                
                                const processedChunk = manager.processChunk(chunkText, {
                                    model: model,
                                    usage: { inputTokens, outputTokens }
                                });
                                yield processedChunk;
                            }
                        }
                        
                        // Check for message completion
                        if (chunk.type === 'message_stop' || chunk.type === 'content_block_stop') {
                            break;
                        }
                    }
                    
                    // Process any tool calls found
                    if (hasToolCalls && toolCalls.length > 0) {
                        for (const toolCall of toolCalls) {
                            // Invoke onFunctionCall callback if provided
                            if (options?.onFunctionCall) {
                                options.onFunctionCall({
                                    name: toolCall.name,
                                    args: toolCall.args
                                });
                            }
                            
                            // Yield tool call start chunk
                            yield {
                                content: '',
                                delta: '',
                                isComplete: false,
                                metadata: {
                                    type: 'tool_call_start',
                                    tool_name: toolCall.name,
                                    tool_args: toolCall.args
                                }
                            } as StreamChunk;
                            
                            // Execute the tool
                            const tool = tools.find((t: any) => t.name === toolCall.name);
                            if (!tool) {
                                throw new Error(`Tool not found: ${toolCall.name}`);
                            }
                            
                            try {
                                const toolResponse = await tool.execute(toolCall.args || {});
                                
                                // Yield tool result chunk
                                yield {
                                    content: toolResponse,
                                    delta: '', // Don't print tool result to console
                                    isComplete: false,
                                    metadata: {
                                        type: 'tool_result',
                                        tool_name: toolCall.name,
                                        tool_args: toolCall.args,
                                        tool_response: toolResponse
                                    }
                                } as StreamChunk;
                                
                                // Update conversation context
                                currentContents.push({
                                    role: "assistant",
                                    content: accumulatedText
                                });
                                
                                currentContents.push({
                                    role: "user",
                                    content: `Tool result for ${toolCall.name}: ${toolResponse}`
                                });
                                
                                // Update persistent state
                                state.history.push({
                                    role: "assistant" as const,
                                    content: accumulatedText,
                                    tool_calls: [{
                                        id: toolCall.name || "",
                                        function: {
                                            name: toolCall.name || "",
                                            arguments: JSON.stringify(toolCall.args || {})
                                        }
                                    }]
                                } as any);
                                
                                state.history.push({
                                    role: "tool" as const,
                                    tool_call_id: toolCall.name || "",
                                    content: toolResponse
                                });
                                
                                // Reset accumulated text for next iteration
                                accumulatedText = '';
                                
                            } catch (toolError) {
                                console.error(`[ERROR] Tool execution failed for ${toolCall.name}:`, toolError);
                                throw toolError;
                            }
                        }
                        
                        // Continue with next iteration to get more content
                        continue;
                    }
                    
                    // If no tool calls were found, we're done
                    break;
                }
                
                // Complete the stream
                const finalChunk = manager.complete();
                
                // Record token usage for budget tracking
                if (budgetTracker) {
                    recordTokenUsage({
                        inputTokens,
                        outputTokens,
                        totalTokens: inputTokens + outputTokens
                    });
                }
                
                yield finalChunk;
                
            } catch (error) {
                manager.error(error as Error);
                throw error;
            }
        }

        return streamGenerator();
    }
}

export function createClaudeClient({
    apiKey,
    model,
    tools,
    config,
}: {
    apiKey: string;
    model: string;
    tools?: any[];
    config?: LLMConfig;
}) {
    return new ClaudeClient(apiKey, model, tools, config);
}
