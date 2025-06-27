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

    protected async _invoke(prompt: string): Promise<string> {
        let currentHistory = [...this.state.history];
        
        // Only include tools config if we actually have tools defined
        let config: any = {};
        
        if (this.tools.length > 0) {
            // Convert tools to Gemini function declarations
            const functionDeclarations = this.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: Type.OBJECT,
                    properties: Object.entries(tool.parameters).reduce((acc, [key, value]) => {
                        acc[key] = {
                            type: value.type === "number" ? Type.NUMBER : Type.STRING,
                            description: value.description,
                        };
                        return acc;
                    }, {} as any),
                    required: Object.keys(tool.parameters),
                },
            }));

            config = {
                tools: [{
                    function_declarations: functionDeclarations
                }]
            };
        }

        // Filter out system messages and convert to Gemini format
        // For Gemini, we'll prepend system content to the first user message
        let systemPrompt = "";
        let contents: any[] = [];
        
        for (const msg of currentHistory) {
            if (msg.role === "system") {
                systemPrompt = msg.content;
            } else if (msg.role === "user") {
                const userContent = systemPrompt ? `${systemPrompt}\n\n${msg.content}` : msg.content;
                contents.push({ role: "user", parts: [{ text: userContent }] });
                systemPrompt = ""; // Only add system prompt to first user message
            } else if (msg.role === "assistant") {
                contents.push({ role: "model", parts: [{ text: msg.content }] });
            }
            // Skip tool messages for now - they're handled differently in function calling
        }

        // Loop until no more function calls
        while (true) {
            const generateOptions: any = {
                model: this.model,
                contents,
            };
            
            // Only add tools config if we have tools
            if (this.tools.length > 0) {
                generateOptions.tools = config.tools;
            }
            
            const result = await this.ai.models.generateContent(generateOptions);

            if (result.functionCalls && result.functionCalls.length > 0) {
                // Execute all function calls
                for (const functionCall of result.functionCalls) {
                    const tool = this.tools.find((t) => t.name === functionCall.name);
                    if (!tool) throw new Error(`Tool not found: ${functionCall.name}`);
                    
                    const toolResponse = await tool.execute(functionCall.args || {});
                    
                    // Create function response part
                    const functionResponsePart = {
                        name: functionCall.name || "",
                        response: { result: toolResponse }
                    };

                    // Add the model's response with function call
                    contents.push({
                        role: "model",
                        parts: [{ functionCall } as any]
                    });

                    // Add the function response
                    contents.push({
                        role: "user",
                        parts: [{ functionResponse: functionResponsePart } as any]
                    });

                    // Add to persistent state - only access text if no function calls
                    const responseText = result.functionCalls.length === 0 ? (result.text || "") : "";
                    this.state.history.push({
                        role: "assistant" as const,
                        content: responseText,
                        tool_calls: [{
                            id: functionCall.name || "",
                            function: {
                                name: functionCall.name || "",
                                arguments: JSON.stringify(functionCall.args || {})
                            }
                        }]
                    } as any);

                    this.state.history.push({
                        role: "tool" as const,
                        tool_call_id: functionCall.name || "",
                        content: toolResponse
                    });
                }
            } else {
                // No more function calls, return the final response
                const finalResponse = result.text || "";
                
                // Record token usage for budget tracking (Gemini doesn't provide exact token counts)
                if (this.budgetTracker) {
                    // Estimate token usage based on text length
                    const inputTokens = Math.ceil(JSON.stringify(contents).length / 4);
                    const outputTokens = Math.ceil(finalResponse.length / 4);
                    
                    this.recordTokenUsage({
                        inputTokens,
                        outputTokens,
                        totalTokens: inputTokens + outputTokens
                    });
                }
                
                return finalResponse;
            }
        }
    }

    protected async _invokeStream(prompt: string): Promise<AsyncIterableIterator<StreamChunk>> {
        let currentHistory = [...this.state.history];
        
        // Only include tools config if we actually have tools defined
        let config: any = {};
        
        if (this.tools.length > 0) {
            // Convert tools to Gemini function declarations
            const functionDeclarations = this.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: Type.OBJECT,
                    properties: Object.entries(tool.parameters).reduce((acc, [key, value]) => {
                        acc[key] = {
                            type: value.type === "number" ? Type.NUMBER : Type.STRING,
                            description: value.description,
                        };
                        return acc;
                    }, {} as any),
                    required: Object.keys(tool.parameters),
                },
            }));

            config = {
                tools: [{
                    function_declarations: functionDeclarations
                }]
            };
        }

        // Filter out system messages and convert to Gemini format
        let systemPrompt = "";
        let contents: any[] = [];
        
        for (const msg of currentHistory) {
            if (msg.role === "system") {
                systemPrompt = msg.content;
            } else if (msg.role === "user") {
                const content = systemPrompt ? `${systemPrompt}\n\n${msg.content}` : msg.content;
                contents.push({
                    role: "user",
                    parts: [{ text: content }]
                });
                systemPrompt = ""; // Only add system prompt to first user message
            } else if (msg.role === "assistant") {
                contents.push({
                    role: "model",
                    parts: [{ text: msg.content }]
                });
            }
        }

        const model = this.ai.models;

        const manager = new StreamManager();
        let inputTokens = 0;
        let outputTokens = 0;
        const modelName = this.model;
        const budgetTracker = this.budgetTracker;
        const recordTokenUsage = this.recordTokenUsage.bind(this);

        // Estimate input tokens
        inputTokens = Math.ceil(JSON.stringify(contents).length / 4);

        async function* streamGenerator() {
            try {
                const generateOptions: any = {
                    model: modelName,
                    contents: contents,
                };
                
                // Only add tools config if we have tools
                if (config.tools) {
                    generateOptions.tools = config.tools;
                }
                
                const result = await model.generateContentStream(generateOptions);

                let fullText = '';
                
                for await (const chunk of result) {
                    const chunkText = chunk.text || '';
                    if (chunkText) {
                        fullText += chunkText;
                        outputTokens += Math.ceil(chunkText.length / 4);
                        
                        const processedChunk = manager.processChunk(chunkText, {
                            model: modelName,
                            usage: { inputTokens, outputTokens }
                        });
                        yield processedChunk;
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
