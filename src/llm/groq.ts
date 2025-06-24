import Groq from "groq-sdk";
import { LLMBase } from "./base";

export function createGroqClient({
    apiKey,
    model,
}: {
    apiKey: string;
    model: string;
}) {
    const groq = new Groq({ apiKey });

    return new (class extends LLMBase {
        constructor() {
            super("groq", model);
        }

        protected async _invoke(prompt: string): Promise<string> {
            const res = await groq.chat.completions.create({
                model: this.model,
                messages: this.state.history,
            });
            return res.choices[0].message.content || "";
        }
    })();
}