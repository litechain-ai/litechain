/**
 * Litechain Comprehensive Demo - Main Entry Point
 * 
 * This is the main entry point for exploring all Litechain features.
 * Run different demos to see various capabilities.
 */

import litechain from "../../dist/index.js";
import { DemoLogger } from "./utils/demo-helpers.ts";
import { runDemo as runBudgetEmbeddingsDemo } from "./budget-embeddings-demo.ts";

// Simple demo without external dependencies
async function simpleLitechainDemo() {
  console.clear();
  console.log(`
  ██╗     ██╗████████╗███████╗ ██████╗██╗  ██╗ █████╗ ██╗███╗   ██╗
  ██║     ██║╚══██╔══╝██╔════╝██╔════╝██║  ██║██╔══██╗██║████╗  ██║
  ██║     ██║   ██║   █████╗  ██║     ███████║███████║██║██╔██╗ ██║
  ██║     ██║   ██║   ██╔══╝  ██║     ██╔══██║██╔══██║██║██║╚██╗██║
  ███████╗██║   ██║   ███████╗╚██████╗██║  ██║██║  ██║██║██║ ╚████║
  ╚══════╝╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝
  
  Welcome to Litechain - The Simple LLM Framework
  `);

  DemoLogger.section("🚀 Litechain Key Features Overview");

  console.log(`
  🎯 What makes Litechain special:

  ✨ ONE IMPORT vs Multiple Imports
     - Langchain: import { ChatOpenAI } from "@langchain/openai"; import { Tool } from "@langchain/core/tools"; ...
     - Litechain:  import litechain from "litechain";

  ⚡ SIMPLE SETUP vs Complex Configuration  
     - Just: litechain.llm.openai({ apiKey: "...", model: "gpt-4" })
     - No need for separate prompt templates, chains, or complex setup

  🔗 AUTOMATIC LLM CHAINING vs Manual Routing
     - LLMs automatically route with [TRANSFER:target] and [ESCALATE:target]
     - Built-in conversation flow tracking and state management

  🛠️ DIRECT TOOL DEFINITIONS vs Zod Schemas
     - Simple object tools vs complex schema definitions
     - Unified tool calling across all providers

  🧠 BUILT-IN MEMORY & STATE vs Manual Management
     - Automatic conversation history and memory management
     - Debug-friendly state inspection and flow tracking

  🌐 MULTI-PROVIDER UNIFIED API
     - OpenAI, Gemini, Claude, Groq with same interface
     - Consistent tool calling and streaming across providers
  `);

  if (!process.env.OPENAI_API_KEY) {
    DemoLogger.warning("⚠️  No OPENAI_API_KEY found in environment");
    console.log(`
  📋 To run the full demo:
  
  1. Copy .env.example to .env
  2. Add your API keys:
     OPENAI_API_KEY=your_key_here
     GROQ_API_KEY=your_key_here (optional)
     GEMINI_API_KEY=your_key_here (optional)
  
  3. Install dependencies:
     npm install
  
  4. Run demos:
     npm run demo:basic      # Basic usage patterns
     npm run demo:chaining   # LLM chaining and routing  
     npm run demo:memory     # Memory management
     npm run demo:streaming  # Streaming capabilities
     npm run demo:tools      # Advanced tool usage
     npm run demo:all        # Complete interactive demo
    `);
    return;
  }

  // Basic demo with API key
  DemoLogger.step("Running basic Litechain demo");
  
  try {
    const llm = litechain.llm.openai({
      apiKey: process.env.OPENAI_API_KEY!,
      model: "gpt-4o-mini"
    });

    // 1. Simple conversation
    DemoLogger.info("1. Simple conversation:");
    const response1 = await llm.invoke("Hello! Explain Litechain in one sentence.");
    console.log(`   🤖 ${response1}`);
    console.log();

    // 2. System prompt with variables
    DemoLogger.info("2. System prompt with variables:");
    llm.systemprompt = "You are a {role} assistant. Be {tone} and {style}.";
    const response2 = await llm.invoke("How does LLM chaining work?", {
      role: "technical",
      tone: "helpful", 
      style: "concise"
    });
    console.log(`   🤖 ${response2.substring(0, 150)}...`);
    console.log();

    // 3. Tool usage
    DemoLogger.info("3. Tool usage:");
    llm.addTool({
      name: "calculate",
      description: "Perform arithmetic calculations",
      parameters: {
        expression: { type: "string", description: "Math expression like '2 + 2'" }
      },
      execute: async (params: any) => {
        try {
          const result = Function(`"use strict"; return (${params.expression.replace(/[^0-9+\-*/().\s]/g, '')})`)();
          return `${params.expression} = ${result}`;
        } catch {
          return "Error in calculation";
        }
      }
    });

    llm.systemprompt = "You are a helpful assistant with access to a calculator.";
    const response3 = await llm.invoke("What's 125 * 8 + 47?");
    console.log(`   🤖 ${response3}`);
    console.log();

    // 4. State inspection
    DemoLogger.info("4. State management:");
    console.log(`   📊 Thread ID: ${llm.state.thread_id.substring(0, 8)}...`);
    console.log(`   📊 History length: ${llm.state.history.length}`);
    console.log(`   📊 Tools available: ${llm.tools.length}`);
    console.log(`   📊 Conversation flow: ${llm.state.conversation_flow.length} entries`);
    console.log();

    DemoLogger.success("✅ Basic demo completed successfully!");

    console.log(`
  🎯 Next steps:
  
  1. Run the full demos:
     npm run demo:all        # Interactive comprehensive demo
     npm run demo:chaining   # See LLM chaining in action
     npm run demo:tools      # Advanced tool combinations
  
  2. Explore the code:
     - basic-usage.ts        # Simple patterns
     - llm-chaining.ts       # Multi-LLM workflows  
     - memory-demo.ts        # State and memory
     - streaming-demo.ts     # Real-time streaming
  
  3. Build your own:
     - Copy patterns from examples
     - Mix and match LLM providers
     - Create custom tools and workflows
     
  📚 Full documentation: README.md
  🔗 GitHub: https://github.com/litechain-ai/litechain
    `);

  } catch (error) {
    DemoLogger.error(`Demo error: ${error}`);
    console.log("\nThis might be due to API key issues or network connectivity.");
  }
}

// Show available demo commands
function showDemoMenu() {
  console.log(`
  🎯 Litechain Demo Menu
  
  Available demos:
  
  📁 Individual Features:
     npm run demo:basic      # Basic usage and setup
     npm run demo:chaining   # LLM chaining and routing
     npm run demo:memory     # Memory and state management  
     npm run demo:streaming  # Streaming responses
     npm run demo:budget     # Budget tracking & embeddings
     
  📁 Advanced Features:
     npm run demo:tools      # Advanced tool usage
  
  🎭 Complete Experience:
     npm run demo:all        # Interactive comprehensive demo
     npm start               # This overview demo
  
  📋 Setup:
     1. Copy .env.example to .env
     2. Add your API keys (at minimum OPENAI_API_KEY)
     3. npm install
     4. Choose a demo above
  
  📚 Learn more: README.md
  `);
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showDemoMenu();
} else {
  simpleLitechainDemo().catch(console.error);
}
