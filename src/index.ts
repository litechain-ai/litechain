import { createOpenAIClient } from "./llm/openai";
import { createGroqClient } from "./llm/groq";
import { createGeminiClient } from "./llm/gemini";
import { createClaudeClient } from "./llm/claude";

export default {
  llm: {
    openai: createOpenAIClient,
    groq: createGroqClient,
    gemini: createGeminiClient,
    claude: createClaudeClient,
  }
};
