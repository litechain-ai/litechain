/**
 * Basic usage demonstration of Litechain
 * Shows fundamental features and simple tool usage
 */

import litechain from "../../dist/index.js";
import dotenv from "dotenv";
import { DemoLogger, validateEnvironment, createDemoTools } from "./utils/demo-helpers.ts";

dotenv.config();

async function demonstrateBasicUsage() {
  DemoLogger.section("Litechain Basic Usage Demo");

  if (!validateEnvironment()) {
    return;
  }

  // 1. Simple LLM Setup
  DemoLogger.step("Setting up OpenAI LLM");
  const llm = litechain.llm.openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini"
  });

  // 2. Basic conversation
  DemoLogger.step("Basic conversation without tools");
  const simpleResponse = await llm.invoke("Hello! Introduce yourself briefly.");
  DemoLogger.response(simpleResponse);
  DemoLogger.separator();

  // 3. System prompt demonstration
  DemoLogger.step("Setting system prompt");
  llm.systemprompt = "You are a helpful assistant that speaks like a pirate. Keep responses brief but stay in character.";
  
  const pirateResponse = await llm.invoke("What's your favorite programming language?");
  DemoLogger.response(pirateResponse);
  DemoLogger.separator();

  // 4. Variable interpolation
  DemoLogger.step("Demonstrating variable interpolation");
  llm.systemprompt = "You are a {role} assistant helping with {task}. Be {tone} in your responses.";
  
  const templatedResponse = await llm.invoke("Help me get started", {
    role: "friendly coding",
    task: "JavaScript development", 
    tone: "encouraging and detailed"
  });
  DemoLogger.response(templatedResponse);
  DemoLogger.separator();

  // 5. Adding tools
  DemoLogger.step("Adding tools to LLM");
  const tools = createDemoTools();
  tools.forEach(tool => llm.addTool(tool));

  llm.systemprompt = "You are a helpful assistant with access to various tools. Use them when appropriate.";
  
  const toolResponse = await llm.invoke("What's 25 * 4 + 12? Also, what time is it?");
  DemoLogger.response(toolResponse);
  DemoLogger.separator();

  // 6. State inspection
  DemoLogger.step("Inspecting LLM state");
  console.log("Thread ID:", llm.state.thread_id);
  console.log("History length:", llm.state.history.length);
  console.log("Tools available:", llm.tools.length);
  DemoLogger.separator();

  // 7. Multiple provider demonstration
  if (process.env.GROQ_API_KEY) {
    DemoLogger.step("Demonstrating multiple providers");
    
    const groqLLM = litechain.llm.groq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.1-8b-instant"
    });

    groqLLM.systemprompt = "Respond in exactly one sentence.";
    const groqResponse = await groqLLM.invoke("What makes Groq special for AI inference?");
    DemoLogger.response(`Groq: ${groqResponse}`);
  }

  if (process.env.GEMINI_API_KEY) {
    const geminiLLM = litechain.llm.gemini({
      apiKey: process.env.GEMINI_API_KEY,
      model: "gemini-2.0-flash"
    });

    geminiLLM.systemprompt = "Respond in exactly one sentence.";
    const geminiResponse = await geminiLLM.invoke("What's unique about Google's Gemini models?");
    DemoLogger.response(`Gemini: ${geminiResponse}`);
  }

  DemoLogger.success("Basic usage demo completed!");
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateBasicUsage().catch(console.error);
}

export { demonstrateBasicUsage };
