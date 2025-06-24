# Litechain

**Litechain** is a TypeScript/JavaScript library for building LLM-powered applications with seamless tool/function calling. It provides a unified, ergonomic API for integrating OpenAI, Gemini, Claude, and Groq models, allowing you to register custom tools and let the LLM invoke them as needed.

---

## Features

- 🛠️ **Tool/Function Calling:** Register your own tools/functions and let the LLM call them automatically.
- 🤖 **Unified API:** Use OpenAI, Gemini, Claude, or Groq with a consistent interface.
- ⚡ **Simple Integration:** Just one import—no need to import types or utilities separately.
- 🧩 **Extensible:** Add as many tools as you want, with custom parameters and logic.

---

## Installation

```bash
npm install litechain
```

> **Note:** You must also install the relevant LLM SDKs for the providers you use (e.g., `openai`, `@google/genai`, `@anthropic-ai/sdk`, `groq-sdk`).

---

## Quickstart

```ts
import litechain from "litechain";
import dotenv from "dotenv";
dotenv.config();

const client = litechain.llm.openai({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "gpt-4o-mini",
  tools: [
    {
      name: "add",
      description: "Add two numbers",
      parameters: {
        a: { type: "number", description: "The first number" },
        b: { type: "number", description: "The second number" }
      },
      execute: async ({ a, b }) => (a + b).toString()
    },
    {
      name: "get_time",
      description: "Get the current time",
      parameters: {},
      execute: async () => new Date().toISOString()
    },
    {
      name: "multiply",
      description: "Multiply two numbers",
      parameters: {
        a: { type: "number", description: "The first number" },
        b: { type: "number", description: "The second number" }
      },
      execute: async ({ a, b }) => (a * b).toString()
    }
  ]
});

const main = async () => {
  const response = await client.invoke(
    "multiply 4 with 5 and add the result with 342 and get the current time"
  );
  console.log(response);
};

main();
```

---

## Supported Providers

- **OpenAI** (`openai`)
- **Gemini** (`@google/genai`)
- **Claude** (`@anthropic-ai/sdk`)
- **Groq** (`groq-sdk`)

---

## How Tool Calling Works

1. **Register tools** with a name, description, parameters, and an `execute` function.
2. **Invoke** the LLM with a prompt. If the LLM decides a tool is needed, Litechain:
   - Parses the tool call from the LLM.
   - Executes your tool(s) with the provided arguments.
   - Feeds the result(s) back to the LLM.
   - Returns the final LLM response to you.

---

## API Reference

### `litechain.llm.[provider]({ apiKey, model, tools })`

- `apiKey`: Your provider API key.
- `model`: The model name (e.g., `"gpt-4o-mini"`).
- `tools`: Array of tool definitions.

### Tool Definition

```ts
{
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string }>;
  execute: (parameters: Record<string, any>) => Promise<string>;
}
```

---

## Example Use Cases

- Build chatbots that can do math, fetch data, or interact with APIs.
- Let LLMs call your business logic functions automatically.
- Prototype AI agents with real-world actions.

---

## Roadmap

- [ ] Streaming support
- [ ] Function calling for Claude and Gemini (when available)
- [ ] More advanced conversation memory

---

## License

MIT

---

**Litechain** makes LLM tool/function calling easy and extensible.  
PRs and feedback welcome! 