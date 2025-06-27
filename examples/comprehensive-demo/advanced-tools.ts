/**
 * Advanced tools demonstration
 * Shows complex tool usage patterns and compositions
 */

import litechain from "../../dist/index.js";
import dotenv from "dotenv";
import { DemoLogger, validateEnvironment, createDemoTools } from "./utils/demo-helpers.ts";
// import { toolChainExamples } from "./utils/mock-data";

dotenv.config();

async function demonstrateAdvancedTools() {
  DemoLogger.section("Advanced Tools Demo");

  if (!validateEnvironment()) {
    return;
  }

  // 1. Complex Tool Chain
  DemoLogger.step("Setting up advanced tool ecosystem");
  
  const llm = litechain.llm.openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini"
  });

  // Create advanced tools
  const advancedTools = [
    ...createDemoTools(),
    {
      name: "weather_lookup",
      description: "Get weather information for a city",
      parameters: {
        city: {
          type: "string",
          description: "City name to get weather for"
        },
        unit: {
          type: "string", 
          description: "Temperature unit: celsius or fahrenheit"
        }
      },
      execute: async (parameters: any) => {
        // Mock weather data
        const temps = { celsius: Math.floor(Math.random() * 30), fahrenheit: Math.floor(Math.random() * 86) + 32 };
        const conditions = ["sunny", "cloudy", "rainy", "snowy"];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        
        const temp = parameters.unit === "fahrenheit" ? temps.fahrenheit : temps.celsius;
        const unit = parameters.unit === "fahrenheit" ? "°F" : "°C";
        
        return `Weather in ${parameters.city}: ${temp}${unit}, ${condition}`;
      }
    },
    {
      name: "file_operations",
      description: "Simulate file operations like create, read, or list",
      parameters: {
        operation: {
          type: "string",
          description: "Operation: create, read, or list"
        },
        filename: {
          type: "string",
          description: "Filename (if applicable)"  
        },
        content: {
          type: "string",
          description: "File content (for create operation)"
        }
      },
      execute: async (parameters: any) => {
        const { operation, filename, content } = parameters;
        
        switch (operation) {
          case "create":
            return `Created file '${filename}' with ${content?.length || 0} characters`;
          case "read":
            return `Reading file '${filename}': [Mock file content for demonstration]`;
          case "list":
            return "Files: demo.txt, config.json, README.md, app.js";
          default:
            return `Unknown operation: ${operation}`;
        }
      }
    },
    {
      name: "data_analysis",
      description: "Analyze datasets and provide insights",
      parameters: {
        data_type: {
          type: "string",
          description: "Type of data: sales, users, performance, etc."
        },
        period: {
          type: "string", 
          description: "Time period: daily, weekly, monthly"
        }
      },
      execute: async (parameters: any) => {
        const insights = {
          sales: "Sales increased 15% this period with highest revenue on weekends",
          users: "User engagement up 22%, with mobile users showing highest activity",
          performance: "System performance improved 8% with average response time of 120ms"
        };
        
        const insight = insights[parameters.data_type as keyof typeof insights] || "No specific insights available";
        return `${parameters.period} ${parameters.data_type} analysis: ${insight}`;
      }
    }
  ];

  // Add all tools to LLM
  advancedTools.forEach(tool => llm.addTool(tool));

  llm.systemprompt = "You are a versatile assistant with access to various tools. Use them strategically to provide comprehensive answers.";

  DemoLogger.success(`Loaded ${llm.tools.length} tools successfully`);

  // 2. Test Complex Tool Chains
  DemoLogger.step("Testing complex tool combinations");
  
  const complexQueries = [
    "Calculate 15% of 1000, then check the weather in New York, and create a file called 'weather-report.txt' with the weather information.",
    "Generate a UUID, get the current time in ISO format, then analyze our weekly sales data.",
    "Count the words in 'The quick brown fox jumps over the lazy dog', then calculate the square of that number, and list all files.",
    "What's the weather like in London in Celsius? Then create a summary file and analyze our user data for this month."
  ];

  for (const [index, query] of complexQueries.entries()) {
    DemoLogger.separator();
    DemoLogger.info(`Complex Query ${index + 1}:`);
    DemoLogger.user(query);
    
    const response = await llm.invoke(query);
    DemoLogger.response(response);
    
    // Show tool usage statistics
    const toolCalls = llm.state.history.filter(h => 'tool_call_id' in h);
    if (toolCalls.length > 0) {
      DemoLogger.info(`Tools used: ${toolCalls.length} tool calls`);
    }
  }

  DemoLogger.separator();

  // 3. Tool Error Handling
  DemoLogger.step("Tool error handling demonstration");
  
  const errorTool = {
    name: "error_prone_tool",
    description: "A tool that sometimes fails to test error handling",
    parameters: {
      should_fail: {
        type: "string",
        description: "Whether the tool should fail: yes or no"
      }
    },
    execute: async (parameters: any) => {
      if (parameters.should_fail === "yes") {
        throw new Error("Simulated tool failure");
      }
      return "Tool executed successfully!";
    }
  };

  llm.addTool(errorTool);

  try {
    await llm.invoke("Use the error_prone_tool with should_fail set to yes");
  } catch (error) {
    DemoLogger.info("Error handling test completed - errors handled gracefully");
  }

  // 4. Tool Performance Analysis
  DemoLogger.step("Tool performance analysis");
  
  const performanceTest = async (toolName: string, query: string) => {
    const startTime = Date.now();
    const response = await llm.invoke(query);
    const endTime = Date.now();
    
    return {
      tool: toolName,
      duration: endTime - startTime,
      responseLength: response.length
    };
  };

  const performanceTests = [
    { tool: "calculate", query: "Calculate 123 * 456" },
    { tool: "get_time", query: "What time is it in ISO format?" },
    { tool: "weather_lookup", query: "What's the weather in Tokyo?" },
    { tool: "word_count", query: "Count words in 'Hello world from Litechain'" }
  ];

  DemoLogger.info("Running performance tests...");
  const results = [];
  
  for (const test of performanceTests) {
    llm.clearState(); // Clear state for clean test
    const result = await performanceTest(test.tool, test.query);
    results.push(result);
  }

  // Display performance results
  DemoLogger.info("Performance Results:");
  results.forEach(result => {
    console.log(`  ${result.tool}: ${result.duration}ms (${result.responseLength} chars)`);
  });

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(`  Average: ${Math.round(avgDuration)}ms`);

  DemoLogger.success("Advanced tools demo completed!");
}

// Tool composition patterns
async function demonstrateToolComposition() {
  DemoLogger.section("Tool Composition Patterns");

  const llm = litechain.llm.openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini"
  });

  // Create composite tools that use other tools internally
   const compositeTools = [
    {
      name: "analyze_text_complete",
      description: "Complete text analysis including word count, time stamp, and UUID generation",
      parameters: {
        text: {
          type: "string",
          description: "Text to analyze completely"
        }
      },
      execute: async (parameters: any) => {
        const text = parameters.text;
        const words = text.trim().split(/\s+/).filter((w: string) => w.length > 0);
        const chars = text.length;
        const timestamp = new Date().toISOString();
        const analysisId = crypto.randomUUID();
        
        return `Complete Analysis [${analysisId}]:
- Text: "${text}"
- Word count: ${words.length}
- Character count: ${chars}
- Analysis time: ${timestamp}
- Sentences: ${text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0).length}`;
      }
    },
    {
      name: "system_status",
      description: "Get comprehensive system status including time and performance metrics",
      parameters: {},
      execute: async () => {
        const timestamp = new Date().toISOString();
        const uptime = process.uptime();
        const memory = process.memoryUsage();
        
        return `System Status Report:
- Current time: ${timestamp}
- Uptime: ${Math.floor(uptime / 60)} minutes
- Memory usage: ${Math.round(memory.heapUsed / 1024 / 1024)}MB
- Process ID: ${process.pid}
- Status: Operational`;
      }
    }
  ];


  compositeTools.forEach(tool => llm.addTool(tool));

  llm.systemprompt = "You have access to both simple and composite tools. Use the most appropriate tool for each task.";

  // Test composite tool usage
  DemoLogger.step("Testing composite tools");
  
  const compositeQueries = [
    "Do a complete analysis of this text: 'Litechain makes LLM development simple and powerful.'",
    "Give me a full system status report",
    "Analyze this quote completely: 'The best way to predict the future is to invent it.' - Alan Kay"
  ];

  for (const query of compositeQueries) {
    DemoLogger.user(query);
    const response = await llm.invoke(query);
    DemoLogger.response(response);
    DemoLogger.separator();
  }

  // Tool interaction patterns
  DemoLogger.step("Tool interaction patterns");
  
  const interactionQuery = "First get a system status, then analyze the word count of the status message, and finally generate a UUID for this operation.";
  DemoLogger.user(interactionQuery);
  
  const interactionResponse = await llm.invoke(interactionQuery);
  DemoLogger.response(interactionResponse);

  // Show tool call sequence
  const toolHistory = llm.state.history.filter(h => 'tool_call_id' in h);
  if (toolHistory.length > 0) {
    DemoLogger.info("Tool interaction sequence:");
    toolHistory.forEach((call, index) => {
      console.log(`  ${index + 1}. Tool response: ${call.content.substring(0, 50)}...`);
    });
  }

  DemoLogger.success("Tool composition patterns completed!");
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  Promise.resolve()
    .then(() => demonstrateAdvancedTools())
    .then(() => demonstrateToolComposition())
    .catch(console.error);
}


async function main() {
  console.log("🔍 Starting Advanced Tools Demo...");
  
  try {
    // Run advanced tools demonstration
    await demonstrateAdvancedTools();
    
    console.log("\n" + "=".repeat(60) + "\n");
    
    // Run tool composition patterns
    await demonstrateToolComposition();
    
    console.log("\n🎉 Advanced tools demo completed successfully!");
    console.log("🔍 All demonstrations finished without errors");
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
    DemoLogger.error(`Advanced tools demo failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🔍 Advanced Tools Demo script executed directly");
  main();
} else {
  // If imported, also run main by default
  main();
}

main();
// export { demonstrateAdvancedTools, demonstrateToolComposition, main };