import OpenAI from "openai";
import { LLMBase } from "./base";
import { Tool } from "./base";

export function createOpenAIClient({
    apiKey,
    model,
    tools,
}: {
    apiKey: string;
    model: string;
    tools?: Tool[];
}) {
    const openai = new OpenAI({ apiKey });

    return new (class extends LLMBase {
        constructor() {
            super("openai", model);
            if (tools) {
                tools.forEach((tool) => {
                    this.addTool(tool);
                });
            }
        }

        protected async _invoke(prompt: string): Promise<string> {
            let currentHistory = [...this.state.history];
            let res = await openai.chat.completions.create({
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
                res = await openai.chat.completions.create({
                    model: this.model,
                    messages: currentHistory,
                });
            }

            // 5. Return the final LLM response
            return res.choices[0].message.content || "";
        }
    })();
}
