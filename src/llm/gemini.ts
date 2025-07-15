import { GoogleGenAI, Type } from "@google/genai";
import { LLMBase, LLMConfig } from "./base";
import { StreamChunk } from "../types/streaming";
import { StreamManager } from "../utils/streaming";

class GeminiClient extends LLMBase {
    private ai: GoogleGenAI;

    constructor(apiKey: string, model: string, tools?: any[], config?: LLMConfig) {
        super("gemini", model, config);
        this.ai = new GoogleGenAI({ apiKey });
        if (tools) {
            tools.forEach((tool) => {
                this.addTool(tool);
            });
        }
    }

    protected async _invoke(prompt: string, conversationId: string = "default"): Promise<string> {
        const state = this.getOrCreateState(conversationId);
        // For backward compatibility, we'll collect all chunks and return the final result
        const chunks: string[] = [];
        const stream = await this._invokeStream(prompt, undefined, conversationId);
        
        for await (const chunk of stream) {
            if (chunk.content) {
                chunks.push(chunk.content);
            }
        }
        
        return chunks.join('');
    }

    protected async _invokeStream(prompt: string, options?: { onFunctionCall?: (functionCall: { name: string; args: Record<string, any> }) => void }, conversationId: string = "default"): Promise<AsyncIterableIterator<StreamChunk>> {
        const state = this.getOrCreateState(conversationId);
        
        // Create tool descriptions for system prompt
        const toolDescriptions = this.tools.map((tool) => {
            const params = Object.entries(tool.parameters)
                .map(([key, value]) => `${key} (${value.type}): ${value.description}`)
                .join(', ');
            return `- ${tool.name}: ${tool.description}. Parameters: ${params}`;
        }).join('\n');

        // Filter out system messages and convert to Gemini format
        let systemPrompt = "";
        let contents: any[] = [];
        
        // Add system instruction for tool usage
        if (this.tools.length > 0) {
            const toolInstruction = `You have access to the following tools. When you need to use a tool, format your response as follows:

AVAILABLE TOOLS:
${toolDescriptions}

TOOL USAGE FORMAT:
When you need to use a tool, write: [TOOL_CALL:tool_name:{"param1": "value1", "param2": "value2"}]

Example: [TOOL_CALL:fetchDietPlan:{"uid": "user123"}]

After the tool call, continue with your response based on the tool result.`;
            
            contents.push({
                role: "user",
                parts: [{ text: toolInstruction }]
            });
        }
        
        for (const msg of state.history) {
            if (msg.role === "system") {
                systemPrompt = msg.content;
            } else if (msg.role === "user") {
                const userContent = systemPrompt ? `${systemPrompt}\n\n${msg.content}` : msg.content;
                contents.push({ role: "user", parts: [{ text: userContent }] });
                systemPrompt = ""; // Only add system prompt to first user message
            } else if (msg.role === "assistant") {
                contents.push({ role: "model", parts: [{ text: msg.content }] });
            }
            // Skip tool messages for now
        }
        // Ensure contents is never empty
        if (contents.length === 0 && prompt) {
            contents.push({ role: "user", parts: [{ text: prompt }] });
        }

        const model = this.ai.models;
        const manager = new StreamManager();
        let inputTokens = 0;
        let outputTokens = 0;
        const modelName = this.model;
        const budgetTracker = this.budgetTracker;
        const recordTokenUsage = this.recordTokenUsage.bind(this);
        const tools = this.tools;
        // Remove: const state = this.state; (no duplicate declaration)

        // Estimate input tokens
        inputTokens = Math.ceil(JSON.stringify(contents).length / 4);

        async function* streamGenerator() {
            try {
                let currentContents = [...contents];
                let accumulatedText = '';
                let toolCallBuffer = '';
                let inToolCall = false;

                while (true) {
                    const generateOptions: any = {
                        model: modelName,
                        contents: currentContents,
                    };
                    
                    const result = await model.generateContentStream(generateOptions);

                    let hasToolCalls = false;
                    let toolCalls: any[] = [];
                    
                    for await (const chunk of result) {
                        const chunkText = chunk.text || '';
                        
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
                                model: modelName,
                                usage: { inputTokens, outputTokens }
                            });
                            yield processedChunk;
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
                                    delta: '',
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
                                    role: "model",
                                    parts: [{ text: accumulatedText }]
                                });
                                
                                currentContents.push({
                                    role: "user",
                                    parts: [{ text: `Tool result for ${toolCall.name}: ${toolResponse}` }]
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

export function createGeminiClient({
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
    return new GeminiClient(apiKey, model, tools, config);
}
