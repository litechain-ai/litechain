import litechain from "../../src/index";
import dotenv from "dotenv";

dotenv.config();

async function demonstrateLLMChaining() {
  console.log("🚀 LiteChain LLM Chaining Demo\n");

  // 1. Setup LLMs
  const llm1 = litechain.llm.openai({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-3.5-turbo"
  });

  const llm2 = litechain.llm.groq({
    apiKey: process.env.GROQ_API_KEY!, 
    model: "llama-3.1-8b-instant"
  });

  const llm3 = litechain.llm.gemini({
    apiKey: process.env.GEMINI_API_KEY!,
    model: "gemini-2.0-flash"
  });

  // Set system prompts
  llm1.systemprompt = `
You are the entry point support agent.
Answer basic queries. For billing issues, respond with: [TRANSFER:BILLING]
For technical issues, respond with: [TRANSFER:TECH]
Keep responses friendly and helpful.
Do not use any tools or functions - just respond with text.
`;

  llm2.systemprompt = `You are a tech support specialist. Fix technical issues and provide solutions. Do not use any tools or functions - just respond with text.`;

  llm3.systemprompt = `
You handle billing inquiries. If a refund is needed, respond with: [ESCALATE:HUMAN]
Otherwise, help with billing questions.
Do not use any tools or functions - just respond with text.
`;

  // 2. Hook LLM routing
  llm1.connect({
    BILLING: llm3,
    TECH: llm2
  });

  llm3.connect({
    HUMAN: async (message: string) => {
      console.log("⚠️  Escalating to human...");
      console.log(`Message: ${message}`);
      return "A human will join shortly to assist you with your refund request.";
    }
  });

  // 3. Test different scenarios
  const testCases = [
    "Hello, how are you?",
    "I need help with my internet connection",
    "I want a refund for my last order",
    "What's the weather like?",
    "My billing statement is incorrect"
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 User: ${testCase}`);
    console.log("🔄 Processing...");
    
    const reply = await llm1.invoke(testCase);
    console.log(`🤖 Response: ${reply}`);
    
    // Show conversation flow
    console.log("\n📊 Conversation Flow:");
    const flow = llm1.getConversationFlow();
    flow.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.llmName}: "${entry.response}"`);
      if (entry.transferTarget) {
        console.log(`     → Transferred to: ${entry.transferTarget}`);
      }
    });

    // Show transfer history
    const transfers = llm1.getTransferHistory();
    if (transfers.length > 0) {
      console.log("\n🔄 Transfer History:");
      transfers.forEach((transfer, index) => {
        console.log(`  ${index + 1}. ${transfer.type.toUpperCase()} to ${transfer.target} at ${transfer.timestamp.toLocaleTimeString()}`);
      });
    }

    console.log("\n" + "=".repeat(60));
  }

  // 4. Demonstrate state management
  console.log("\n🔍 State Management Demo:");
  console.log(`Thread ID: ${llm1.state.thread_id}`);
  console.log(`Total conversation entries: ${llm1.state.conversation_flow.length}`);
  console.log(`Total transfers: ${llm1.state.transfers.length}`);
  
  // Clear state for fresh start
  console.log("\n🧹 Clearing state...");
  llm1.clearState();
  console.log(`New Thread ID: ${llm1.state.thread_id}`);
}

// Run the demo
demonstrateLLMChaining().catch(console.error); 