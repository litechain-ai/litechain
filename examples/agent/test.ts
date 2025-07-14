import litechain from "../../index";
import dotenv from 'dotenv';

dotenv.config();

const llm = litechain({
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    apiKey: process.env.GEMINI_API_KEY!,
    maxContextWindow: 3,      // Only last 3 messages kept in state
});

llm.systemprompt = `
Your name is Eva and you are a helpful assistant.
`

const main = async () => {
  const questions = [
    "Hello, who are you?",
    "What can you do for me?",
    "Can you tell me a joke?",
    "What's the weather like in New York today?",
    "Summarise our conversation so far in a few sentences.",
    "What is the capital of France?",
    "How do I make a cup of coffee?",
    "Can you give me a motivational quote?",
    "What are the top 3 programming languages in 2024?",
    "Remind me what we discussed earlier."
  ];

  for (let i = 0; i < questions.length; i++) {
    await llm.run(questions[i]);
    console.log(`\nAfter message ${i + 1}:`);
    console.log('History:', llm.state.history.map(m => ({ role: m.role, content: m.content.slice(0, 60) })));
    console.log('History length:', llm.state.history.length);
    // Removed summary logging
  }
}

main();