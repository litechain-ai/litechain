import { GoogleGenAI } from "@google/genai";
import { LLMBase } from "./base";

export function createGeminiClient({
    apiKey,
    model,
    tools,
}: {
    apiKey: string;
    model: string;
    tools?: any[];
}) {
    const ai = new GoogleGenAI({ apiKey });

    return new (class extends LLMBase {
        constructor() {
            super("gemini", model);
            if (tools) {
                tools.forEach((tool) => {
                    this.addTool(tool);
                });
            }
        }

        protected async _invoke(prompt: string): Promise<string> {
            let currentHistory = [...this.state.history];
            // Convert history to Gemini's expected format
            const messages = currentHistory.map((msg) => {
                if (msg.role === "user") return { role: "user", parts: [{ text: msg.content }] };
                if (msg.role === "assistant") return { role: "model", parts: [{ text: msg.content }] };
                if (msg.role === "system") return { role: "system", parts: [{ text: msg.content }] };
                if (msg.role === "tool") return { role: "function", parts: [{ functionResponse: { name: msg.tool_call_id, content: msg.content } }] };
                return msg;
            });
            const res = await ai.models.generateContent({
                model: this.model,
                contents: messages,
            });
            // Gemini does not yet support function calling in the same way as OpenAI, so this is a placeholder for future support
            // If/when Gemini supports tool_calls, add similar logic as in openai.ts here
            return res.text ?? "";
        }
    })();
}
