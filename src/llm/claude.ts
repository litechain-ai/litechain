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

    protected async _invokeStream(prompt: string): Promise<AsyncIterableIterator<StreamChunk>> {
        let currentHistory = [...this.state.history];
        // Only include 'user' and 'assistant' roles for Claude
        const messages = currentHistory
            .filter((msg) => msg.role === "user" || msg.role === "assistant")
            .map((msg) => ({ role: msg.role as "user" | "assistant", content: msg.content }));

        const stream = await this.anthropic.messages.create({
            model: this.model,
            max_tokens: 1024,
            messages,
            stream: true,
        });

        const manager = new StreamManager();
        let inputTokens = 0;
        let outputTokens = 0;
        const model = this.model;
        const budgetTracker = this.budgetTracker;
        const recordTokenUsage = this.recordTokenUsage.bind(this);

        // Estimate input tokens
        inputTokens = Math.ceil(JSON.stringify(messages).length / 4);

        async function* streamGenerator() {
            try {
                let fullText = '';
                for await (const chunk of stream) {
                    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                        const chunkText = chunk.delta.text;
                        if (chunkText) {
                            fullText += chunkText;
                            outputTokens += Math.ceil(chunkText.length / 4);
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
