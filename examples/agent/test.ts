import litechain from "../../index";
import dotenv from 'dotenv';

dotenv.config();

const AddTool = {
    name: "add",
    description: "Add two numbers",
    parameters: {
        type: "object",
        properties: {
            a: { type: "number" },
            b: { type: "number" }
        },
        required: ["a", "b"]
    },
    execute: async (args: { a: number, b: number }) => {
        return (args.a + args.b).toString();
    }
}

const llm = litechain({
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    apiKey: process.env.GEMINI_API_KEY!,
    maxContextWindow: 3,      // Only last 3 messages kept in state
    tools: [AddTool]
});

llm.systemprompt = `
Your name is Eva and you are a helpful assistant. Reply with "{TEMPLATE}"
`

const main = async () => {
  const questions = [
    "What is 1 + 1?",
   
  ];

  for (let i = 0; i < questions.length; i++) {
    await llm.run(questions[i], {variables: {TEMPLATE: "Hello, who are you?"}}, `conversation-${i}`);
    console.log(`\nAfter message ${i + 1}:`);
    console.log('History:', llm.getConversationFlow(`conversation-${i}`));
    console.log('History length:', llm.getConversationFlow(`conversation-${i}`).length);
    // Removed summary logging
  }
}

main();