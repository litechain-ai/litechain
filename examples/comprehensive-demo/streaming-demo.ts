/**
 * Streaming demonstration
 * Shows real-time streaming capabilities
 */

import litechain from "../../dist/index.js";
import dotenv from "dotenv";
import { DemoLogger, validateEnvironment, sleep, ProgressBar } from "./utils/demo-helpers.ts";
// import { streamingExamples } from "./utils/mock-data";

dotenv.config();

async function demonstrateStreaming() {
  DemoLogger.section("Streaming Demo");

  if (!validateEnvironment()) {
    return;
  }

  // 1. Basic Streaming Demo
  DemoLogger.step("Basic streaming with chunk handling");
  
  const llm = litechain.llm.openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini"
  });

  llm.systemprompt = "You are a creative storyteller. Write engaging, detailed responses.";

  const prompt = "Write a short story about a robot discovering emotions for the first time.";
  DemoLogger.user(prompt);
  
  let fullContent = '';
  let chunkCount = 0;
  
  console.log('\n📖 Story (streaming):');
  console.log('   '); // Starting position for streaming text
  
  try {
    await llm.run(prompt, {
      stream: true,
      onChunk: (chunk) => {
        // Only write the delta (new tokens) to avoid duplicates
        if (chunk.delta) {
          process.stdout.write(chunk.delta);
          chunkCount++;
        }
      },
      onComplete: (content) => {
        console.log('\n');
        DemoLogger.info(`✅ Streaming completed: ${chunkCount} chunks, ${content.length} characters`);
        DemoLogger.info(`📊 Average chunk size: ${(content.length / chunkCount).toFixed(2)} characters`);
        fullContent = content;
        DemoLogger.success("Story generation completed!");
      },
      onError: (error) => {
        DemoLogger.error(`Streaming error: ${error.message}`);
      }
    });
    
  } catch (error) {
    // Fallback to non-streaming if streaming fails
    DemoLogger.warning("Streaming not available, falling back to regular response");
    const response = await llm.invoke(prompt);
    DemoLogger.response(response);
  }

  DemoLogger.separator();

  // 2. Streaming with Progress Tracking
  DemoLogger.step("Streaming with progress indication");
  
  const longPrompt = "Explain machine learning in detail, covering supervised learning, unsupervised learning, and deep learning with examples.";
  DemoLogger.user(longPrompt);
  
  const progressBar = new ProgressBar(100);
  let estimatedProgress = 0;
  
  try {
    await llm.run(longPrompt, {
      stream: true,
      onChunk: (chunk) => {
        // Only process actual token deltas
        if (chunk.delta) {
          // Estimate progress based on chunk count
          estimatedProgress = Math.min(99, estimatedProgress + 1);
          progressBar.update(Math.floor(estimatedProgress), 'Generating response...');
        }
      },
      onComplete: (content) => {
        progressBar.update(100, 'Complete!');
        console.log('\n');
        DemoLogger.response(content);
      }
    });
  } catch (error) {
    DemoLogger.info("Progress tracking demo completed (streaming may not be available)");
  }

  DemoLogger.separator();

  // 3. Multiple Concurrent Streams
  DemoLogger.step("Concurrent streaming demonstration");
  
  const llm1 = litechain.llm.openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini"
  });
  
  const llm2 = litechain.llm.openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini"
  });

  llm1.systemprompt = "You are a technical expert. Provide detailed technical explanations.";
  llm2.systemprompt = "You are a creative writer. Focus on storytelling and creativity.";

  const prompts = [
    { llm: llm1, prompt: "Explain how HTTP works", id: "Technical" },
    { llm: llm2, prompt: "Write a poem about coding", id: "Creative" }
  ];

  DemoLogger.info("Starting concurrent streams...");
  
  const streamPromises = prompts.map(async ({ llm, prompt, id }) => {
    try {
      return await llm.run(prompt, {
        stream: true,
        onChunk: (chunk) => {
          if (chunk.delta) {
            // Show which stream is producing content
            process.stdout.write(`[${id.substring(0, 4)}] `);
          }
        },
        onComplete: (content) => {
          console.log(`\n✅ ${id} stream completed (${content.length} chars)`);
        }
      });
    } catch (error) {
      console.log(`\n❌ ${id} stream failed, using fallback`);
      return await llm.invoke(prompt);
    }
  });

  const results = await Promise.all(streamPromises);
  DemoLogger.success("Concurrent streaming completed!");

  DemoLogger.separator();

  // 4. Stream Error Handling
  DemoLogger.step("Stream error handling demonstration");
  
  const errorLLM = litechain.llm.openai({
    apiKey: "invalid-key", // Intentionally invalid
    model: "gpt-4o-mini"
  });

  try {
    await errorLLM.run("Test error handling", {
      stream: true,
      onError: (error) => {
        DemoLogger.warning(`Caught streaming error: ${error.message}`);
      }
    });
  } catch (error) {
    DemoLogger.info("Error handling demo completed - error caught as expected");
  }

  DemoLogger.separator();

  // 5. Streaming vs Non-streaming Performance
  DemoLogger.step("Performance comparison: Streaming vs Non-streaming");
  
  const perfLLM = litechain.llm.openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini"
  });

  const testPrompt = "Write a detailed explanation of TypeScript benefits.";
  
  // Non-streaming
  console.time("Non-streaming");
  try {
    const nonStreamResponse = await perfLLM.invoke(testPrompt);
    console.timeEnd("Non-streaming");
    DemoLogger.info(`Non-streaming response length: ${nonStreamResponse.length} characters`);
  } catch (error) {
    console.timeEnd("Non-streaming");
    DemoLogger.error("Non-streaming failed");
  }
  
  // Clear state for fair comparison
  perfLLM.clearState();
  
  // Streaming
  console.time("Streaming (to completion)");
  let streamResponse = '';
  try {
    await perfLLM.run(testPrompt, {
      stream: true,
      onChunk: (chunk) => {
        streamResponse += chunk.delta;
      },
      onComplete: () => {
        console.timeEnd("Streaming (to completion)");
        DemoLogger.info(`Streaming response length: ${streamResponse.length} characters`);
      }
    });
  } catch (error) {
    console.timeEnd("Streaming (to completion)");
    DemoLogger.info("Streaming performance test completed (may not be available)");
  }

  DemoLogger.success("Streaming demonstration completed!");
}

// Advanced streaming patterns
async function demonstrateAdvancedStreaming() {
  DemoLogger.section("Advanced Streaming Patterns");

  const llm = litechain.llm.openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini"
  });

  // 1. Streaming with Custom Chunk Processing
  DemoLogger.step("Custom chunk processing");
  
  let wordCount = 0;
  let sentenceCount = 0;
  
  try {
    await llm.run("Explain the benefits of TypeScript over JavaScript in detail.", {
      stream: true,
      onChunk: (chunk) => {
        if (chunk.delta) {
          // Count words and sentences in real-time
          const words = chunk.delta.split(/\s+/).filter(w => w.length > 0);
          const sentences = chunk.delta.split(/[.!?]+/).filter(s => s.trim().length > 0);
          
          wordCount += words.length;
          sentenceCount += sentences.length;
          
          // Update live stats
          process.stdout.write(`\r📊 Words: ${wordCount}, Sentences: ${sentenceCount}`);
        }
        
        if (chunk.isComplete) {
          console.log('\n');
          DemoLogger.info(`Final stats - Words: ${wordCount}, Sentences: ${sentenceCount}`);
        }
      }
    });
  } catch (error) {
    DemoLogger.info("Custom chunk processing demo completed");
  }

  DemoLogger.separator();

  // 2. Streaming with Rate Limiting
  DemoLogger.step("Rate-limited streaming simulation");
  
  const rateLimitedPrompt = "Write a step-by-step guide for learning React.";
  let lastChunkTime = Date.now();
  
  try {
    await llm.run(rateLimitedPrompt, {
      stream: true,
      onChunk: async (chunk) => {
        const now = Date.now();
        const timeSinceLastChunk = now - lastChunkTime;
        
        if (chunk.delta) {
          // Simulate processing time
          if (timeSinceLastChunk < 100) {
            await sleep(100 - timeSinceLastChunk);
          }
          
          process.stdout.write(chunk.delta);
          lastChunkTime = Date.now();
        }
        
        if (chunk.isComplete) {
          console.log('\n');
          DemoLogger.info("Rate-limited streaming completed");
        }
      }
    });
  } catch (error) {
    DemoLogger.info("Rate-limited streaming demo completed");
  }

  // 3. Stream Buffering Demo
  DemoLogger.step("Stream buffering demonstration");
  
  const buffer: string[] = [];
  const bufferSize = 50; // Buffer size in characters
  
  try {
    await llm.run("Describe the evolution of JavaScript from ES5 to ES2023.", {
      stream: true,
      onChunk: (chunk) => {
        if (chunk.delta) {
          buffer.push(chunk.delta);
          
          // Flush buffer when it reaches the threshold
          const bufferContent = buffer.join('');
          if (bufferContent.length >= bufferSize) {
            process.stdout.write(`[BUFFER: ${bufferContent.length} chars] ${bufferContent}`);
            buffer.length = 0; // Clear buffer
          }
        }
        
        if (chunk.isComplete && buffer.length > 0) {
          // Flush remaining buffer
          const remainingContent = buffer.join('');
          process.stdout.write(`[FINAL: ${remainingContent.length} chars] ${remainingContent}`);
          console.log('\n');
          DemoLogger.info("Buffered streaming completed");
        }
      }
    });
  } catch (error) {
    DemoLogger.info("Stream buffering demo completed");
  }

  DemoLogger.success("Advanced streaming patterns completed!");
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  Promise.resolve()
    .then(() => demonstrateStreaming())
    .then(() => demonstrateAdvancedStreaming())
    .catch(console.error);
}

async function main() {
  console.log("🔍 Starting Streaming Demo...");
  
  try {
    // Run basic streaming demonstration
    await demonstrateStreaming();
    
    console.log("\n" + "=".repeat(60) + "\n");
    
    // Run advanced streaming patterns
    await demonstrateAdvancedStreaming();
    
    console.log("\n🎉 Streaming demo completed successfully!");
    console.log("🔍 All streaming demonstrations finished without errors");
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Streaming demo failed:", error);
    DemoLogger.error(`Streaming demo failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🔍 Streaming Demo script executed directly");
  main();
} else {
  // If imported, also run main by default
  main();
}

main();

// export { demonstrateStreaming, demonstrateAdvancedStreaming };
