import Anthropic from "@anthropic-ai/sdk";
import { LLMBase } from "./base";

export function createClaudeClient({
    apiKey,
    model,
    tools,
}: {
    apiKey: string;
    model: string;
    tools?: any[];
}) {
    const anthropic = new Anthropic({ apiKey });

    return new (class extends LLMBase {
        constructor() {
            super("claude", model);
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
            const res = await anthropic.messages.create({
                model: this.model,
                max_tokens: 1024,
                messages,
            });
            // Extract text from ContentBlock(s)
            const text = Array.isArray(res.content)
                ? res.content.map((block: any) => typeof block.text === "string" ? block.text : "").join("")
                : "";
            return text;
        }
    })();
}
