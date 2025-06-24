import OpenAI from "openai";
import { LLMBase } from "./base";

export function createOpenAIClient(apiKey: string) {
  const openai = new OpenAI({ apiKey });

  return new (class extends LLMBase {
    constructor() {
      super("openai", "gpt-4o");
    }

    protected async _invoke(prompt: string): Promise<string> {
      const res = await openai.chat.completions.create({
        model: this.model,
        messages: this.state.history,
      });
      return res.choices[0].message.content || "";
    }
  })();
}
