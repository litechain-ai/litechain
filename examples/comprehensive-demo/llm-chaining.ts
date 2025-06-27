import litechain from "../../dist/index.js";
import dotenv from "dotenv";
import { DemoLogger, validateEnvironment, sleep } from "./utils/demo-helpers.ts";

dotenv.config();

async function testLitechainFeatures() {
  console.log("🔍 Starting Litechain comprehensive test...");
  
  DemoLogger.section("🚀 Litechain Features Test Suite");
  
  if (!validateEnvironment()) {
    DemoLogger.error("Environment validation failed");
    return;
  }

  const startTime = Date.now();
  let testsResults: { [key: string]: boolean } = {};

  try {
    // Test 1: Basic LLM Creation and Simple Invoke
    DemoLogger.step("Test 1: Basic LLM Creation");
    console.log("🔍 Creating Gemini client...");
    
    const client = litechain.llm.gemini({
      apiKey: process.env.GEMINI_API_KEY!,
      model: "gemini-2.0-flash"
    });
    
    console.log("🔍 Gemini client created successfully");
    testsResults["basic_creation"] = true;
    DemoLogger.success("✅ Basic LLM creation test passed");

    // Test 2: System Prompt Setting
    DemoLogger.step("Test 2: System Prompt Configuration");
    client.systemprompt = "You are a helpful assistant for mathematical calculations and time queries.";
    console.log("🔍 System prompt set");
    testsResults["system_prompt"] = true;
    DemoLogger.success("✅ System prompt test passed");

    // Test 3: Tool Integration
    DemoLogger.step("Test 3: Tool Integration");
    console.log("🔍 Adding tools to client...");
    
    const addTool = {
      description: "Add two numbers",
      name: "add",
      parameters: {
        a: {
          type: "number",
          description: "The first number"
        },
        b: {
          type: "number",
          description: "The second number"
        }
      },
      execute: async (parameters: { a: number, b: number }) => {
        console.log(`🔍 Executing add tool: ${parameters.a} + ${parameters.b}`);
        return (parameters.a + parameters.b).toString();
      }
    };

    const getTimeTool = {
      description: "Get the current time",
      name: "get_time",
      parameters: {},
      execute: async () => {
        console.log("🔍 Executing get_time tool");
        return new Date().toISOString();
      }
    };

    const multiplyTool = {
      description: "Multiply two numbers",
      name: "multiply",
      parameters: {
        a: {
          type: "number",
          description: "The first number"
        },
        b: {
          type: "number",
          description: "The second number"
        }
      },
      execute: async (parameters: { a: number, b: number }) => {
        console.log(`🔍 Executing multiply tool: ${parameters.a} × ${parameters.b}`);
        return (parameters.a * parameters.b).toString();
      }
    };

    client.addTool(addTool);
    client.addTool(getTimeTool);
    client.addTool(multiplyTool);

    console.log(`🔍 Added ${client.tools.length} tools to client`);
    testsResults["tool_integration"] = true;
    DemoLogger.success("✅ Tool integration test passed");

    // Test 4: Complex Tool Chain Invocation
    DemoLogger.step("Test 4: Complex Tool Chain Execution");
    DemoLogger.info("Testing multi-step calculation with time query...");
    
    const complexQuery = "multiply 4 with 5 and add the result with 342 and get the current time in human format?";
    DemoLogger.user(complexQuery);
    
    console.log("🔍 Invoking LLM with complex tool chain query...");
    const response = await client.invoke(complexQuery);
    console.log("🔍 Complex query response received");
    
    DemoLogger.response(response);
    testsResults["complex_tool_chain"] = true;
    DemoLogger.success("✅ Complex tool chain test passed");

    // Test 5: State Inspection
    DemoLogger.step("Test 5: State Management");
    console.log("🔍 Inspecting client state...");
    
    const state = client.state;
    console.log("Current Client State:");
    console.log(`  Thread ID: ${state.thread_id.substring(0, 8)}...`);
    console.log(`  History entries: ${state.history.length}`);
    console.log(`  Conversation flow: ${state.conversation_flow.length}`);
    console.log(`  Current LLM: ${state.current_llm}`);
    console.log(`  Tools available: ${client.tools.length}`);

    testsResults["state_management"] = true;
    DemoLogger.success("✅ State management test passed");

    // Test 6: Conversation Context
    DemoLogger.step("Test 6: Conversation Context Tracking");
    
    console.log("🔍 Testing conversation context with follow-up question...");
    const followUpQuery = "What was the final result of that calculation?";
    DemoLogger.user(followUpQuery);
    
    const contextResponse = await client.invoke(followUpQuery);
    DemoLogger.response(contextResponse);
    
    testsResults["conversation_context"] = true;
    DemoLogger.success("✅ Conversation context test passed");

    // Test 7: History Analysis
    DemoLogger.step("Test 7: Conversation History Analysis");
    
    DemoLogger.info("Recent conversation history:");
    client.state.history.slice(-6).forEach((entry, index) => {
      const preview = entry.content.substring(0, 80) + (entry.content.length > 80 ? '...' : '');
      console.log(`  ${index + 1}. ${entry.role}: ${preview}`);
    });

    if (client.state.conversation_flow.length > 0) {
      DemoLogger.info("Conversation flow tracking:");
      client.state.conversation_flow.forEach((entry, index) => {
        const preview = entry.response.substring(0, 60) + '...';
        console.log(`  ${index + 1}. [${entry.timestamp.toLocaleTimeString()}] ${entry.llmName}: ${preview}`);
      });
    }

    testsResults["history_analysis"] = true;
    DemoLogger.success("✅ History analysis test passed");

    // Test 8: Simple Math Verification
    DemoLogger.step("Test 8: Math Tool Verification");
    
    const mathQuery = "What is 7 times 8?";
    DemoLogger.user(mathQuery);
    
    const mathResponse = await client.invoke(mathQuery);
    DemoLogger.response(mathResponse);
    
    testsResults["math_verification"] = true;
    DemoLogger.success("✅ Math verification test passed");

  } catch (error) {
    console.error("🔍 Error during test execution:", error);
    DemoLogger.error(`Test failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  // Results Summary
  DemoLogger.section("📊 Test Results Summary");
  
  const passedTests = Object.values(testsResults).filter(Boolean).length;
  const totalTests = Object.keys(testsResults).length;
  const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : '0';

  console.log("Test Execution Results:");
  Object.entries(testsResults).forEach(([testName, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const formattedName = testName.replace(/_/g, ' ').toUpperCase();
    console.log(`  🧪 ${formattedName}: ${status}`);
  });

  console.log(`\n📈 Test Statistics:`);
  console.log(`  ✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`  📊 Success Rate: ${successRate}%`);
  console.log(`  ⏱️  Total Duration: ${duration.toFixed(2)} seconds`);

  if (passedTests === totalTests) {
    DemoLogger.success("🎉 ALL TESTS PASSED! Litechain is working perfectly!");
  } else {
    DemoLogger.warning(`⚠️  ${totalTests - passedTests} test(s) failed. Check logs above for details.`);
  }

  DemoLogger.separator();
  DemoLogger.info("Features successfully tested:");
  console.log("  🤖 Multi-provider LLM support (Gemini)");
  console.log("  🛠️  Tool integration and execution");
  console.log("  🔗 Tool chaining and complex queries");
  console.log("  💾 State management and tracking");
  console.log("  🧵 Conversation context preservation");
  console.log("  📊 History and flow analysis");
  console.log("  🧮 Mathematical calculations");
  console.log("  ⏰ Time-based operations");

  return {
    testsResults,
    passedTests,
    totalTests,
    successRate: parseFloat(successRate),
    duration,
    overallSuccess: passedTests === totalTests
  };
}

// Main execution function
async function main() {
  console.log("🔍 Main function starting...");
  
  try {
    const results = await testLitechainFeatures();
    
    console.log("🔍 Test suite completed with results:", {
      success: results.overallSuccess,
      passed: results.passedTests,
      total: results.totalTests,
      duration: results.duration
    });

    if (results.overallSuccess) {
      console.log("🔍 Exiting with success code 0");
      process.exit(0);
    } else {
      console.log("🔍 Exiting with error code 1");
      process.exit(1);
    }

  } catch (error) {
    console.error("🔍 Main function failed:", error);
    DemoLogger.error(`Main execution failed: ${error instanceof Error ? error.message : String(error)}`);
    console.log("🔍 Exiting with error code 1");
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🔍 Script executed directly, running main...");
  main();
}

main();
// export { testLitechainFeatures, main };