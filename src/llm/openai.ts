import OpenAI from "openai";
import { LLMBase, LLMConfig } from "./base";
import { Tool } from "./base";
import { StreamChunk } from "../types/streaming";
import { StreamManager } from "../utils/streaming";

class OpenAIClient extends LLMBase {
    private openai: OpenAI;

    constructor(apiKey: string, model: string, tools?: Tool[], config?: LLMConfig) {
        super("openai", model, config);
        this.openai = new OpenAI({ apiKey });
        if (tools) {
            tools.forEach((tool) => {
                this.addTool(tool);
            });
        }
    }

    protected async _invoke(prompt: string): Promise<string> {
        let currentHistory = [...this.state.history];
        let res = await this.openai.chat.completions.create({
            model: this.model,
            messages: currentHistory,
            tools: this.tools.map((tool) => ({
                type: "function",
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: {
                        type: "object",
                        properties: tool.parameters,
                        required: Object.keys(tool.parameters),
                    },
                },
            })),
        });

        while (res.choices[0].message.tool_calls) {
            // 1. Add the assistant message with tool_calls
            const assistantMsg = {
                role: "assistant" as const,
                content: res.choices[0].message.content ?? "",
                tool_calls: res.choices[0].message.tool_calls,
            };

            // 2. For each tool call, execute and create a tool message
            const toolMessages = await Promise.all(
                res.choices[0].message.tool_calls.map(async (toolCall) => {
                    const tool = this.tools.find((t) => t.name === toolCall.function.name);
                    if (!tool) throw new Error(`Tool not found: ${toolCall.function.name}`);
                    const result = await tool.execute(JSON.parse(toolCall.function.arguments));
                    return {
                        role: "tool" as const,
                        tool_call_id: toolCall.id,
                        content: result,
                    };
                })
            );

            // 3. Update the history
            currentHistory = [
                ...currentHistory,
                assistantMsg,
                ...toolMessages,
            ];
            // Also push to this.state.history for persistent state
            this.state.history.push(assistantMsg);
            toolMessages.forEach(msg => this.state.history.push(msg));

            // 4. Get the next LLM response
            res = await this.openai.chat.completions.create({
                model: this.model,
                messages: currentHistory,
            });
        }

        // 5. Return the final LLM response
        const finalResponse = res.choices[0].message.content || "";
        
        // Record token usage for budget tracking
        if (res.usage && this.budgetTracker) {
            this.recordTokenUsage({
                inputTokens: res.usage.prompt_tokens,
                outputTokens: res.usage.completion_tokens,
                totalTokens: res.usage.total_tokens
            });
        }
        
        return finalResponse;
    }

    protected async _invokeStream(prompt: string): Promise<AsyncIterableIterator<StreamChunk>> {
        let currentHistory = [...this.state.history];
        
        const stream = await this.openai.chat.completions.create({
            model: this.model,
            messages: currentHistory,
            stream: true,
            tools: this.tools.map((tool) => ({
                type: "function",
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: {
                        type: "object",
                        properties: tool.parameters,
                        required: Object.keys(tool.parameters),
                    },
                },
            })),
        });

        const manager = new StreamManager();
        let inputTokens = 0;
        let outputTokens = 0;
        const model = this.model;
        const budgetTracker = this.budgetTracker;
        const recordTokenUsage = this.recordTokenUsage.bind(this);

        // Estimate input tokens (rough estimation)
        inputTokens = JSON.stringify(currentHistory).length / 4;

        async function* streamGenerator() {
            try {
                for await (const chunk of stream) {
                    const delta = chunk.choices[0]?.delta?.content || '';
                    
                    if (delta) {
                        outputTokens += Math.ceil(delta.length / 4); // Rough token estimation
                        const processedChunk = manager.processChunk(delta, {
                            model: model,
                            usage: { inputTokens, outputTokens }
                        });
                        yield processedChunk;
                    }
                    
                    // Check if stream is done
                    if (chunk.choices[0]?.finish_reason) {
                        break;
                    }
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

export function createOpenAIClient({
    apiKey,
    model,
    tools,
    config,
}: {
    apiKey: string;
    model: string;
    tools?: Tool[];
    config?: LLMConfig;
}) {
    return new OpenAIClient(apiKey, model, tools, config);
}
