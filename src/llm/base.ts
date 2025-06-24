import { interpolatePrompt } from "../utils/prompt";
import { v4 as uuidv4 } from "uuid";

type LLMMessage =
  | { role: "user" | "assistant" | "system"; content: string }
  | { role: "tool"; tool_call_id: string; content: string };

type LLMState = {
  thread_id: string;
  history: LLMMessage[];
};

export type Tool<P = Record<string, any>> = {
  name: string;
  description: string;
  parameters: P;
  execute: (parameters: P) => Promise<string>;
}

export class LLMBase {
  public state: LLMState;
  public systemprompt: string = "";
  public tools: Tool[] = [];
  constructor(public name: string, public model: string) {
    this.state = {
      thread_id: uuidv4(),
      history: [],
    };
  }

  protected async _invoke(prompt: string): Promise<string> {
    throw new Error("Method not implemented");
  }

  addTool(tool: Tool) {
    this.tools.push(tool);
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
