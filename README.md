# Litechain

**Litechain** is a simple yet powerful drop-in replacement for Langchain to build powerful LLM agents with tools. It provides a unified, ergonomic API for integrating OpenAI, Gemini, Claude, and Groq models, allowing you to register custom tools and let the LLM invoke them as needed, or chain multiple LLMs together for complex AI agent workflows.

```bash
npm i litechain
```

---

## Why Litechain over Langchain?

### 🚀 **One Import vs Multiple Imports**

**Langchain:**
```ts
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { Tool } from "@langchain/core/tools";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { RunnableSequence } from "@langchain/core/runnables";
```

**Litechain:**
```ts
import litechain from "litechain";
```

### 📝 **Prompt Templates: Simple String vs Complex Setup**

**Langchain:**
```ts
import { PromptTemplate } from "@langchain/core/prompts";

const template = PromptTemplate.fromTemplate(
  "You are a helpful assistant. User query: {query}, Context: {context}"
);

const formattedPrompt = await template.format({
  query: "What's the weather?",
  context: "User is in NYC"
});
```

**Litechain:**
```ts
const llm = litechain.llm.openai({ apiKey: "sk-...", model: "gpt-4" });

// Direct string with templates
llm.systemprompt = "You are a helpful assistant. Context: {context}";

// Replace templates while invoking
const response = await llm.invoke("What's the weather?", {
  context: "User is in NYC"
});
```

### 🛠️ **Tool Definition: Simple Object vs Zod Schemas**

**Langchain:**
```ts
import { Tool } from "@langchain/core/tools";
import { z } from "zod";

const addTool = new Tool({
  name: "add",
  description: "Add two numbers",
  schema: z.object({
    a: z.number().describe("The first number"),
    b: z.number().describe("The second number")
  }),
  func: async ({ a, b }) => (a + b).toString()
});
```

**Litechain:**
```ts
const tool = {
  name: "add",
  description: "Add two numbers",
  parameters: {
    a: { type: "number", description: "The first number" },
    b: { type: "number", description: "The second number" }
  },
  execute: async ({ a, b }) => (a + b).toString()
};

llm.addTool(tool);
```

### 🔗 **LLM Connections: Simple vs Complex**

**Langchain:**
```ts
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";

const entryLLM = new ChatOpenAI({ model: "gpt-3.5-turbo" });
const techLLM = new ChatOpenAI({ model: "gpt-4" });

// Complex routing logic with custom functions
const chain = RunnableSequence.from([
  {
    input: (input: string) => input,
    llm: entryLLM
  },
  (output) => {
    if (output.includes("technical")) {
      return techLLM.invoke(output);
    }
    return output;
  }
]);
```

**Litechain:**
```ts
const entryLLM = litechain.llm.openai({ apiKey: "sk-...", model: "gpt-3.5-turbo" });
const techLLM = litechain.llm.openai({ apiKey: "sk-...", model: "gpt-4" });

// Simple connection with automatic routing
entryLLM.connect({ TECH: techLLM });

// LLM automatically routes based on [TRANSFER:TECH] in response
```

---

## Features

- 🛠️ **Tool/Function Calling:** Register your own tools/functions and let the LLM call them automatically.
- 🔗 **LLM Chaining:** Chain multiple LLMs together with automatic routing and transfer capabilities.
- 🤖 **Unified API:** Use OpenAI, Gemini, Claude, or Groq with a consistent interface.
- ⚡ **Simple Integration:** Just one import—no need to import types or utilities separately.
- 🧩 **Extensible:** Add as many tools as you want, with custom parameters and logic.
- 📊 **State Tracking:** Built-in conversation flow and transfer history for debugging and transparency.

---

## Installation

```bash
npm install litechain
```

> **Note:** You must also install the relevant LLM SDKs for the providers you use (e.g., `openai`, `@google/genai`, `@anthropic-ai/sdk`, `groq-sdk`).

---

## Usage

### Basic Setup

```ts
import litechain from "litechain"; // One line import

const llm = litechain.llm.openai({ // Yes, that's simple
  apiKey: process.env.OPENAI_API_KEY!,
  model: "gpt-4o-mini"
});
```

### Define Tools

```ts
const tool = {
  description: "Add two numbers",
  name: "add",
  parameters: {
    a: { type: "number", description: "The first number" },
    b: { type: "number", description: "The second number" }
  },
  execute: async (parameters) => (parameters.a + parameters.b).toString()
};

llm.addTool(tool); // Tool added - no need for Zod or any imports
```

### Set System Prompt

```ts
llm.systemprompt = "You are a helpful assistant"; // System prompt defined
```

### Connect LLMs

```ts
const techLLM = litechain.llm.openai({ apiKey: "sk-...", model: "gpt-4" });
llm.connect({ TECH: techLLM }); // Yes, this is how simple it is to connect LLMs
```

### Access State

```ts
llm.state; // Access state at any point
llm.getConversationFlow(); // Get conversation history
llm.getTransferHistory(); // Get transfer history
llm.clearState(); // Clear conversation state
```

---

## Quickstart

### Basic Tool Calling

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
    }
  ]
});

const response = await client.invoke("add 5 and 3");
console.log(response); // "8"
```

### LLM Chaining

```ts
import litechain from "litechain";

// 1. Setup LLMs
const entryLLM = litechain.llm.openai({
  apiKey: "sk-entry",
  model: "gpt-3.5-turbo"
});

const techLLM = litechain.llm.openai({
  apiKey: "sk-tech", 
  model: "gpt-3.5-turbo"
});

const billingLLM = litechain.llm.openai({
  apiKey: "sk-billing",
  model: "gpt-3.5-turbo"
});

// 2. Set system prompts
entryLLM.systemprompt = `
You are the entry point support agent.
Answer basic queries. For billing issues, respond with: [TRANSFER:BILLING]
For technical issues, respond with: [TRANSFER:TECH]
`;

techLLM.systemprompt = `You are a tech support specialist. Fix technical issues.`;

billingLLM.systemprompt = `
You handle billing inquiries. If a refund is needed, respond with: [ESCALATE:HUMAN]
`;

// 3. Connect LLMs
entryLLM.connect({
  BILLING: billingLLM,
  TECH: techLLM
});

billingLLM.connect({
  HUMAN: async (message) => {
    console.log("⚠️ Escalating to human...");
    return "A human will join shortly.";
  }
});

// 4. Handle message (automatic chaining)
const reply = await entryLLM.invoke("I want a refund for my last order");
console.log(reply); // Final response after going through all LLMs
```

---

## LLM Chaining Guide

### Philosophy

Litechain makes building AI agents extremely simple by allowing you to chain LLMs together with automatic routing. Each LLM can transfer to another LLM or escalate to a human/custom function using simple text patterns.

### Key Concepts

1. **Transfers** (`[TRANSFER:XXX]`): Route to another LLM
2. **Escalations** (`[ESCALATE:XXX]`): Route to a custom function (e.g., human intervention)
3. **Connections**: Define routing rules between LLMs and functions
4. **State Tracking**: Automatic conversation flow and transfer history

### API Reference

#### `llm.connect(routes)`
Connect an LLM to other LLMs or functions for routing.

```ts
llm.connect({
  BILLING: billingLLM,
  TECH: techLLM,
  HUMAN: async (message) => "Human response"
});
```

#### `llm.getConversationFlow()`
Get the conversation flow for debugging.

```ts
const flow = llm.getConversationFlow();
// Returns array of conversation entries with LLM names, messages, responses, and timestamps
```

#### `llm.getTransferHistory()`
Get the transfer history for debugging.

```ts
const transfers = llm.getTransferHistory();
// Returns array of transfer/escalation events
```

#### `llm.clearState()`
Clear the conversation state and start fresh.

```ts
llm.clearState();
```

### Advanced Example: Multi-Department Support System

```ts
// Entry point
const entry = litechain.llm.openai({
  apiKey: "sk-entry",
  model: "gpt-3.5-turbo"
});

// Specialized departments
const sales = litechain.llm.openai({
  apiKey: "sk-sales",
  model: "gpt-4"
});

const support = litechain.llm.openai({
  apiKey: "sk-support", 
  model: "gpt-3.5-turbo"
});

const billing = litechain.llm.openai({
  apiKey: "sk-billing",
  model: "gpt-3.5-turbo"
});

// Set up routing
entry.connect({
  SALES: sales,
  SUPPORT: support,
  BILLING: billing,
  URGENT: async (message) => {
    // Custom logic for urgent issues
    await sendSlackNotification(message);
    return "Urgent issue escalated. You'll be contacted shortly.";
  }
});

// Handle complex queries
const response = await entry.invoke("I need to cancel my subscription and get a refund");
// Automatically routes through appropriate departments
```

---

## Supported Providers

- **OpenAI** (`openai`)
- **Gemini** (`@google/genai`)
- **Claude** (`@anthropic-ai/sdk`)
- **Groq** (`groq-sdk`)

---

## How It Works

### Tool Calling
1. **Register tools** with a name, description, parameters, and an `execute` function.
2. **Invoke** the LLM with a prompt. If the LLM decides a tool is needed, Litechain:
   - Parses the tool call from the LLM.
   - Executes your tool(s) with the provided arguments.
   - Feeds the result(s) back to the LLM.
   - Returns the final LLM response to you.

### LLM Chaining
1. **Set up LLMs** with appropriate system prompts.
2. **Connect them** using the `connect()` method.
3. **Invoke** the entry LLM with a message.
4. **Automatic routing** based on `[TRANSFER:XXX]` and `[ESCALATE:XXX]` patterns.
5. **State tracking** maintains conversation flow and transfer history.

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

### Connection Types

```ts
type ConnectionType = LLMBase | ((message: string) => Promise<string> | string);
```

---

## Example Use Cases

### AI Agents
- **Customer Support**: Route queries to specialized departments
- **Sales Funnel**: Guide prospects through qualification and closing
- **Content Creation**: Chain research, writing, and editing LLMs
- **Code Review**: Route to different specialized code reviewers

### Business Logic
- **Multi-step Processing**: Chain validation, processing, and notification LLMs
- **Decision Trees**: Route based on business rules and conditions
- **Escalation Systems**: Automatic human intervention when needed

---

## Roadmap

- [ ] Streaming support
- [ ] Function calling for Claude and Gemini (when available)
- [ ] More advanced conversation memory
- [ ] Visual conversation flow diagrams
- [ ] Performance metrics and analytics
- [ ] Native memory layer support to optimize tokens

---

## License

MIT

---

**Litechain** makes LLM tool/function calling and chaining easy and extensible.  
PRs and feedback welcome! 