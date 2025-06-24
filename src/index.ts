import { createOpenAIClient } from "./llm/openai";
import { createGroqClient } from "./llm/groq";

export default {
  llm: {
    openai: createOpenAIClient,
    groq: createGroqClient,
  }
};
