import { interpolatePrompt } from "../utils/prompt";
import { v4 as uuidv4 } from "uuid";

type LLMState = {
  thread_id: string;
  history: Array<{ role: "user" | "assistant" | "system", content: string }>;
};

export class LLMBase {
  public state: LLMState;
  public systemprompt: string = "";

  constructor(public name: string, public model: string) {
    this.state = {
      thread_id: uuidv4(),
      history: [],
    };
  }

  protected async _invoke(prompt: string): Promise<string> {
    throw new Error("Method not implemented");
  }

  async invoke(message: string, variables: Record<string, string> = {}) {
    const finalSystem = interpolatePrompt(this.systemprompt, variables);
    const userPrompt = interpolatePrompt(message, variables);

    if (this.state.history.length === 0 && this.systemprompt) {
      this.state.history.push({ role: "system", content: finalSystem });
    }

    this.state.history.push({ role: "user", content: userPrompt });

    const reply = await this._invoke(userPrompt);

    this.state.history.push({ role: "assistant", content: reply });

    return reply;
  }
}
