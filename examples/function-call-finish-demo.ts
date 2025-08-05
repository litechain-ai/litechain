import { createOpenAIClient } from "../src/llm/openai";
import { Tool } from "../src/llm/base";

// Example tool that simulates a weather API
const weatherTool: Tool = {
  name: "get_weather",
  description: "Get the current weather for a location",
  parameters: {
    location: {
      type: "string",
      description: "The city and state, e.g. San Francisco, CA"
    }
  },
  execute: async (parameters: { location: string }) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `The weather in ${parameters.location} is sunny with a temperature of 72°F.`;
  }
};

// Example tool that simulates a calculator
const calculatorTool: Tool = {
  name: "calculate",
  description: "Perform mathematical calculations",
  parameters: {
    expression: {
      type: "string", 
      description: "The mathematical expression to evaluate, e.g. '2 + 2'"
    }
  },
  execute: async (parameters: { expression: string }) => {
    // Simple evaluation (in production, use a safe math library)
    try {
      const result = eval(parameters.expression);
      return `The result of ${parameters.expression} is ${result}`;
    } catch (error) {
      return `Error evaluating expression: ${error}`;
    }
  }
};

async function main() {
  // Create OpenAI client with tools
  const client = createOpenAIClient({
    apiKey: process.env.OPENAI_API_KEY || "your-api-key-here",
    model: "gpt-4o-mini",
    tools: [weatherTool, calculatorTool],
    config: {
      maxContextWindow: 10
    }
  });

  console.log("🤖 Function Call Finish Demo");
  console.log("============================\n");

  // Example 1: Using onFunctionCall and onFunctionCallFinish
  console.log("Example 1: Weather query with callbacks");
  console.log("----------------------------------------");
  
  await client.run("What's the weather like in New York?", {
    onFunctionCall: (functionCall) => {
      console.log(`📞 Function called: ${functionCall.name}`);
      console.log(`📝 Arguments: ${JSON.stringify(functionCall.args)}`);
    },
    onFunctionCallFinish: (functionCall) => {
      console.log(`✅ Function completed: ${functionCall.name}`);
      console.log(`📤 Response: ${functionCall.response}`);
      console.log("---");
    }
  });

  console.log("\n");

  // Example 2: Using onFunctionCallFinish only
  console.log("Example 2: Calculator with finish callback only");
  console.log("------------------------------------------------");
  
  await client.run("What is 15 * 23?", {
    onFunctionCallFinish: (functionCall) => {
      console.log(`🧮 ${functionCall.name} completed:`);
      console.log(`   Input: ${JSON.stringify(functionCall.args)}`);
      console.log(`   Output: ${functionCall.response}`);
      console.log("---");
    }
  });

  console.log("\n");

  // Example 3: Streaming with function call tracking
  console.log("Example 3: Streaming with function call tracking");
  console.log("------------------------------------------------");
  
  const stream = await client.stream("Calculate 100 / 4 and then get weather for London", {
    onFunctionCall: (functionCall) => {
      console.log(`🔄 [STREAM] Function started: ${functionCall.name}`);
    },
    onFunctionCallFinish: (functionCall) => {
      console.log(`✅ [STREAM] Function finished: ${functionCall.name}`);
      console.log(`   Result: ${functionCall.response.substring(0, 50)}...`);
    }
  });

  for await (const chunk of stream) {
    if (chunk.isComplete) {
      console.log(`\n📄 Final response: ${chunk.content}`);
    }
  }

  console.log("\n");

  // Example 4: Error handling in function calls
  console.log("Example 4: Error handling demonstration");
  console.log("----------------------------------------");
  
  const errorTool: Tool = {
    name: "error_demo",
    description: "A tool that always throws an error for demonstration",
    parameters: {},
    execute: async () => {
      throw new Error("This is a simulated error for demonstration");
    }
  };

  const errorClient = createOpenAIClient({
    apiKey: process.env.OPENAI_API_KEY || "your-api-key-here",
    model: "gpt-4o-mini",
    tools: [errorTool]
  });

  try {
    await errorClient.run("Use the error_demo tool", {
      onFunctionCall: (functionCall) => {
        console.log(`📞 About to call: ${functionCall.name}`);
      },
      onFunctionCallFinish: (functionCall) => {
        console.log(`✅ This won't be called due to error`);
      },
      onError: (error) => {
        console.log(`❌ Error caught: ${error.message}`);
      }
    });
  } catch (error) {
    console.log(`💥 Unhandled error: ${error}`);
  }
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}

export { main }; 