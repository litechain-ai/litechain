/**
 * Budget Tracking & Custom Embedding Providers Demo
 * Demonstrates the new enhanced features of Litechain
 */

import litechain from "../../dist/index.js";
import dotenv from "dotenv";
import { DemoLogger, validateEnvironment } from "./utils/demo-helpers.ts";

dotenv.config();

async function demonstrateBudgetTracking() {
  DemoLogger.section("Budget Tracking Demo");

  if (!process.env.OPENAI_API_KEY) {
    console.log("❌ OPENAI_API_KEY required for this demo");
    return;
  }

  // 1. Basic budget tracking setup
  DemoLogger.step("Setting up LLM with budget tracking");
  const chain = litechain({
    provider: 'openai',
    model: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
    budget: {
      limit: 1.0, // $1 USD limit
      onExceeded: (usage) => {
        console.log(`🚨 Budget exceeded! Current usage: $${usage.cost.toFixed(4)}`);
      }
    }
  });

  // 2. Make some calls and track usage
  DemoLogger.step("Making API calls with budget tracking");
  
  const response1 = await chain.invoke("Hello! Tell me a short joke.");
  DemoLogger.response(response1);
  
  let usage = chain.getUsage();
  if (usage) {
    console.log(`💰 Usage after first call: ${usage.tokens} tokens, $${usage.cost.toFixed(4)}`);
  }

  const response2 = await chain.invoke("What's the capital of France?");
  DemoLogger.response(response2);
  
  usage = chain.getUsage();
  if (usage) {
    console.log(`💰 Usage after second call: ${usage.tokens} tokens, $${usage.cost.toFixed(4)}`);
    console.log(`📊 Detailed usage:`, {
      calls: usage.calls,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      remainingBudget: chain.getRemainingBudget()
    });
  }

  DemoLogger.separator();
}

async function demonstrateCustomEmbeddings() {
  DemoLogger.section("Custom Embedding Providers Demo");

  if (!process.env.OPENAI_API_KEY) {
    console.log("❌ OPENAI_API_KEY required for this demo");
    return;
  }

  // 1. Using built-in OpenAI embeddings
  DemoLogger.step("Setting up LLM with OpenAI embeddings");
  const chainWithOpenAI = litechain({
    provider: 'openai',
    model: "gpt-3.5-turbo",
    apiKey: process.env.OPENAI_API_KEY,
    embeddings: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small'
    }
  });

  DemoLogger.response("✅ OpenAI embeddings configured successfully");

  // 2. Using custom embedding function (single text)
  DemoLogger.step("Setting up LLM with custom single-text embedding function");
  const chainWithCustomSingle = litechain({
    provider: 'openai',
    model: "gpt-3.5-turbo",
    apiKey: process.env.OPENAI_API_KEY,
    embeddings: async (text: string) => {
      // Simple mock embedding: convert text to normalized vector
      const chars = text.toLowerCase().split('');
      const vector = new Array(384).fill(0);
      
      for (let i = 0; i < Math.min(chars.length, 384); i++) {
        vector[i] = chars[i].charCodeAt(0) / 255;
      }
      
      // Normalize vector
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
    }
  });

  DemoLogger.response("✅ Custom single-text embedding function configured");

  // 3. Using custom batch embedding function
  DemoLogger.step("Setting up LLM with custom batch embedding function");
  const chainWithCustomBatch = litechain({
    provider: 'openai',
    model: "gpt-3.5-turbo",
    apiKey: process.env.OPENAI_API_KEY,
    embeddings: async (texts: string[]) => {
      // Batch processing mock embeddings
      return texts.map(text => {
        const chars = text.toLowerCase().split('');
        const vector = new Array(384).fill(0);
        
        for (let i = 0; i < Math.min(chars.length, 384); i++) {
          vector[i] = chars[i].charCodeAt(0) / 255;
        }
        
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
      });
    }
  });

  DemoLogger.response("✅ Custom batch embedding function configured");

  // Test with memory (always run the test and log the result)
  DemoLogger.step("Testing memory with custom embeddings");
  const rememberResponse = await chainWithCustomSingle.invoke("Remember that I like pizza");
  DemoLogger.response(`Response to 'Remember that I like pizza': ${rememberResponse}`);
  const recallResponse = await chainWithCustomSingle.invoke("What food do I like?");
  DemoLogger.response(`Response to 'What food do I like?': ${recallResponse}`);
  if (!chainWithCustomSingle.memory) {
    DemoLogger.warning("Memory is not enabled for this chain. The recall may not work as expected.");
  }


  DemoLogger.separator();
}

async function demonstrateCombinedFeatures() {
  DemoLogger.section("Combined Budget + Embeddings Demo");

  if (!process.env.OPENAI_API_KEY) {
    console.log("❌ OPENAI_API_KEY required for this demo");
    return;
  }

  // Setup with both budget tracking and custom embeddings
  DemoLogger.step("Setting up LLM with both budget tracking and custom embeddings");
  const advancedChain = litechain({
    provider: 'openai',
    model: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
    budget: {
      limit: 0.50, // $0.50 limit
      trackTokens: true,
      trackCost: true,
      onExceeded: (usage) => {
        console.log(`🚨 Budget limit reached!`);
        console.log(`📊 Final usage: ${usage.tokens} tokens, $${usage.cost.toFixed(4)}`);
      }
    },
    embeddings: async (text: string) => {
      // Enhanced mock embedding with some randomness
      const base = text.toLowerCase().split('').map(c => c.charCodeAt(0) / 255);
      const vector = new Array(384).fill(0);
      
      for (let i = 0; i < Math.min(base.length, 384); i++) {
        vector[i] = base[i] + (Math.random() * 0.1 - 0.05); // Add small noise
      }
      
      // Normalize
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
    },
    systemPrompt: "You are a helpful assistant that provides concise, informative responses."
  });

  // Test the combined functionality
  DemoLogger.step("Testing combined functionality");
  
  const questions = [
    "What is machine learning?",
    "How does neural networks work?",
    "Explain artificial intelligence briefly."
  ];

  for (const question of questions) {
    const response = await advancedChain.invoke(question);
    DemoLogger.response(`Q: ${question}\nA: ${response}`);
    
    const usage = advancedChain.getUsage();
    if (usage) {
      console.log(`💰 Current usage: ${usage.tokens} tokens, $${usage.cost.toFixed(4)}`);
      const remaining = advancedChain.getRemainingBudget();
      if (remaining !== null) {
        console.log(`💳 Remaining budget: $${remaining.toFixed(4)}`);
      }
    }
    
    DemoLogger.separator();
  }

  // Final usage report
  const finalUsage = advancedChain.getUsage();
  if (finalUsage) {
    DemoLogger.step("Final Usage Report");
    console.log("📊 Complete Usage Statistics:");
    console.log(`   Total API calls: ${finalUsage.calls}`);
    console.log(`   Input tokens: ${finalUsage.inputTokens}`);
    console.log(`   Output tokens: ${finalUsage.outputTokens}`);
    console.log(`   Total tokens: ${finalUsage.tokens}`);
    console.log(`   Total cost: $${finalUsage.cost.toFixed(4)}`);
    
    const remaining = advancedChain.getRemainingBudget();
    if (remaining !== null) {
      console.log(`   Remaining budget: $${remaining.toFixed(4)}`);
    }
  }
}

// Main demo runner
async function runDemo() {
  console.log("🚀 Budget Tracking & Custom Embeddings Demo\n");

  try {
    await demonstrateBudgetTracking();
    await demonstrateCustomEmbeddings(); 
    await demonstrateCombinedFeatures();
    
    console.log("✅ Demo completed successfully!");
  } catch (error) {
    console.error("❌ Demo failed:", error);
    if (error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }
  }
}

// Main function for easy execution
async function main() {
  await runDemo();
}

main()


export { runDemo, main };
