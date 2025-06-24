import Groq from "groq-sdk";
import { LLMBase } from "./base";

export function createGroqClient({
    apiKey,
    model,
    tools,
}: {
    apiKey: string;
    model: string;
    tools?: any[];
}) {
    const groq = new Groq({ apiKey });

    return new (class extends LLMBase {
        constructor() {
            super("groq", model);
            if (tools) {
                tools.forEach((tool) => {
                    this.addTool(tool);
                });
            }
        }

        protected async _invoke(prompt: string): Promise<string> {
            let currentHistory = [...this.state.history];
            let res = await groq.chat.completions.create({
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
                const assistantMsg = {
                    role: "assistant" as const,
                    content: res.choices[0].message.content ?? "",
                    tool_calls: res.choices[0].message.tool_calls,
                };
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
                currentHistory = [
                    ...currentHistory,
                    assistantMsg,
                    ...toolMessages,
                ];
                this.state.history.push(assistantMsg);
                toolMessages.forEach(msg => this.state.history.push(msg));
                res = await groq.chat.completions.create({
                    model: this.model,
                    messages: currentHistory,
                });
            }
            return res.choices[0].message.content || "";
        }
    })();
}