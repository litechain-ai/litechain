/**
 * Comprehensive Litechain Demo
 * Interactive demonstration of all Litechain features
 */

import litechain from "../../index";
import dotenv from "dotenv";
import { DemoLogger, validateEnvironment, sleep } from "./utils/demo-helpers";

dotenv.config();

// Import demo modules
import { demonstrateBasicUsage } from "./basic-usage";
import { demonstrateLLMChaining } from "./llm-chaining";
import { demonstrateMemoryManagement } from "./memory-demo";
import { demonstrateStreaming } from "./streaming-demo";

async function runComprehensiveDemo() {
  console.clear();
  DemoLogger.section("🚀 Litechain Comprehensive Demo");
  
  console.log(`
  ██╗     ██╗████████╗███████╗ ██████╗██╗  ██╗ █████╗ ██╗███╗   ██╗
  ██║     ██║╚══██╔══╝██╔════╝██╔════╝██║  ██║██╔══██╗██║████╗  ██║
  ██║     ██║   ██║   █████╗  ██║     ███████║███████║██║██╔██╗ ██║
  ██║     ██║   ██║   ██╔══╝  ██║     ██╔══██║██╔══██║██║██║╚██╗██║
  ███████╗██║   ██║   ███████╗╚██████╗██║  ██║██║  ██║██║██║ ╚████║
  ╚══════╝╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝
  
  Welcome to the Litechain Comprehensive Demo!
  This demo showcases all the key features that make Litechain powerful.
  `);

  if (!validateEnvironment()) {
    return;
  }

  DemoLogger.info("🎯 What you'll see in this demo:");
  console.log(`
  1. 🔧 Basic Usage - Simple LLM setup and configuration
  2. 🔗 LLM Chaining - Automatic routing between multiple LLMs  
  3. 🧠 Memory Management - Conversation history and state tracking
  4. ⚡ Streaming - Real-time response streaming
  5. 🛠️ Advanced Tools - Complex tool usage and composition
  6. 🎨 Real-world Example - Complete AI assistant
  `);

  await sleep(2000);

  try {
    // 1. Basic Usage Demo
    await demonstrateBasicUsage();
    await pauseBetweenSections();

    // 2. LLM Chaining Demo  
    await demonstrateLLMChaining();
    await pauseBetweenSections();

    // 3. Memory Demo
    await demonstrateMemoryManagement();
    await pauseBetweenSections();

    // 4. Streaming Demo
    await demonstrateStreaming();
    await pauseBetweenSections();

    // 5. Real-world example
    await demonstrateRealWorldExample();

    // 6. Final summary
    showFinalSummary();

  } catch (error) {
    DemoLogger.error(`Demo error: ${error}`);
    console.log("\nSome features may not be available depending on your API keys and setup.");
  }
}

async function pauseBetweenSections() {
  DemoLogger.info("Press Enter to continue to the next section...");
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve(void 0));
  });
}

async function demonstrateRealWorldExample() {
  DemoLogger.section("🎨 Real-World Example: AI Customer Service System");
  
  DemoLogger.step("Creating a complete customer service AI system");
  
  // Create specialized LLMs
  const receptionist = litechain.llm.openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini"
  });

  const technicalSupport = litechain.llm.openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini"
  });

  const salesTeam = litechain.llm.openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini"
  });

  // Configure specialized roles
  receptionist.systemprompt = `You are a friendly receptionist for TechCorp. 
  Route customers appropriately:
  - For technical issues: [TRANSFER:TECH]
  - For sales inquiries: [TRANSFER:SALES] 
  - For general info, help directly
  Always be welcoming and professional.`;

  technicalSupport.systemprompt = `You are a senior technical support engineer.
  Provide detailed solutions for technical problems.
  If you need to escalate: [ESCALATE:MANAGER]`;

  salesTeam.systemprompt = `You are an experienced sales representative.
  Help customers find the right products and pricing.
  Focus on understanding their needs and providing value.`;

  // Add helpful tools
  const customerTools = [
    {
      name: "lookup_customer",
      description: "Look up customer account information",
      parameters: {
        customer_id: { type: "string", description: "Customer ID or email" }
      },
      execute: async (params: any) => {
        return `Customer ${params.customer_id}: Premium account, member since 2022, last ticket: resolved`;
      }
    },
    {
      name: "create_ticket",
      description: "Create a support ticket",
      parameters: {
        issue: { type: "string", description: "Issue description" },
        priority: { type: "string", description: "Priority level: low, medium, high" }
      },
      execute: async (params: any) => {
        const ticketId = "TICKET-" + Math.random().toString(36).substr(2, 9).toUpperCase();
        return `Created ticket ${ticketId} for: ${params.issue} (Priority: ${params.priority})`;
      }
    }
  ];

  customerTools.forEach(tool => {
    receptionist.addTool(tool);
    technicalSupport.addTool(tool);
    salesTeam.addTool(tool);
  });

  // Connect the system
  receptionist.connect({
    TECH: technicalSupport,
    SALES: salesTeam,
    MANAGER: async (message: string) => {
      await sleep(1000);
      return "Thank you for escalating this issue. A manager will review this case and contact the customer within 2 hours. Case escalated successfully.";
    }
  });

  // Test realistic customer scenarios
  const customerScenarios = [
    {
      type: "General Inquiry",
      message: "Hi, I'm interested in learning more about your software solutions for small businesses."
    },
    {
      type: "Technical Issue", 
      message: "I'm having trouble connecting to your API. I keep getting 401 errors even with valid credentials."
    },
    {
      type: "Complex Issue",
      message: "My integration was working fine yesterday, but now I'm getting timeout errors. I'm customer ID: john.doe@company.com"
    }
  ];

  for (const scenario of customerScenarios) {
    DemoLogger.separator();
    DemoLogger.info(`Customer Scenario: ${scenario.type}`);
    DemoLogger.user(scenario.message);
    
    const response = await receptionist.invoke(scenario.message);
    DemoLogger.response(response);
    
    // Show the routing that happened
    const flow = receptionist.getConversationFlow();
    if (flow.length > 1) {
      DemoLogger.info("System Routing:");
      flow.forEach((entry, index) => {
        const dept = entry.llmName === 'openai' ? 'Receptionist' : 
                   entry.transferTarget === 'TECH' ? 'Technical Support' :
                   entry.transferTarget === 'SALES' ? 'Sales Team' : entry.llmName;
        console.log(`  ${index + 1}. ${dept}: Handled request`);
      });
    }
    
    receptionist.clearState(); // Clear for next scenario
    await sleep(1500);
  }

  DemoLogger.success("Real-world customer service system demo completed!");
}

function showFinalSummary() {
  DemoLogger.section("🎉 Demo Complete - Litechain Summary");
  
  console.log(`
  🏆 You've seen the key features that make Litechain powerful:

  ✅ Simple Setup          - One import, unified API across providers
  ✅ LLM Chaining          - Automatic routing with [TRANSFER] and [ESCALATE] 
  ✅ Memory Management     - Built-in conversation state tracking
  ✅ Streaming Support     - Real-time response streaming
  ✅ Tool Integration      - Easy function calling with any LLM
  ✅ State Management      - Debug and inspect conversation flows
  ✅ Multi-Provider        - OpenAI, Gemini, Claude, Groq support
  ✅ Production Ready      - Error handling and robust patterns

  🚀 Next Steps:
  
  1. Install Litechain:     npm install litechain
  2. Get API keys:          OpenAI, Groq, Gemini, or Claude
  3. Start building:        Check the examples in this demo
  4. Read the docs:         See README.md for detailed guide
  5. Join community:        GitHub discussions and issues
  
  💡 Key Advantages over Langchain:
  
  - 📦 Single import vs multiple packages
  - 🎯 Simple syntax vs complex chains  
  - 🔧 Direct tool definitions vs Zod schemas
  - ⚡ Built-in routing vs custom logic
  - 🧠 Automatic state management vs manual tracking
  
  Thank you for exploring Litechain! 
  Visit: https://github.com/litechain-ai/litechain
  `);

  DemoLogger.success("Happy building with Litechain! 🎯");
}

// Quick demo for testing individual features
async function quickFeatureDemo() {
  DemoLogger.section("⚡ Quick Feature Demo");
  
  const llm = litechain.llm.openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini",
    tools: [
      {
        name: "get_time",
        description: "Get current time",
        parameters: {},
        execute: async () => new Date().toISOString()
      }
    ]
  });

  llm.systemprompt = "You are a helpful assistant with access to tools.";
  
  const response = await llm.invoke("What time is it?");
  DemoLogger.response(response);
  
  DemoLogger.success("Quick demo completed!");
}

// Run the appropriate demo based on command line args
const args = process.argv.slice(2);

if (args.includes('--quick')) {
  quickFeatureDemo().catch(console.error);
} else if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveDemo().catch(console.error);
}

export { runComprehensiveDemo, quickFeatureDemo };
