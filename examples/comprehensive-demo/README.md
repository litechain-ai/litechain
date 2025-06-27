# Litechain Comprehensive Demo

This project demonstrates all the key features of Litechain, including:

## Features Demonstrated

### 🔗 **LLM Chaining & Routing**
- Automatic transfer and escalation between LLMs
- Multi-department customer support simulation
- Connection management and routing rules

### 🧠 **Memory Management**
- Chat memory for conversation history
- Vector memory for semantic search
- Hybrid memory combining both approaches
- Persistent storage across sessions

### ⚡ **Streaming Support**
- Real-time streaming responses
- Chunk handling and processing
- Stream management utilities

### 🛠️ **Advanced Tool Integration**
- Multiple tools with different parameter types
- Tool chaining and composition
- Error handling and validation

### 🔍 **State Management & Debugging**
- Conversation flow tracking
- Transfer history monitoring
- Debug utilities and introspection

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment setup:**
   Create a `.env` file with your API keys:
   ```env
   OPENAI_API_KEY=your_openai_key_here
   GROQ_API_KEY=your_groq_key_here
   GEMINI_API_KEY=your_gemini_key_here
   CLAUDE_API_KEY=your_claude_key_here
   ```

## Running the Demos

### Individual Feature Demos

```bash
# Basic usage patterns
npm run demo:basic

# LLM chaining and routing
npm run demo:chaining

# Memory management features
npm run demo:memory

# Streaming capabilities
npm run demo:streaming

# Advanced tool integration
npm run demo:tools
```

### Comprehensive Demo

```bash
# Run all features in an interactive demo
npm run demo:all
```

## Project Structure

```
comprehensive-demo/
├── package.json
├── README.md
├── .env.example
├── tsconfig.json
├── basic-usage.ts          # Basic Litechain usage
├── llm-chaining.ts         # LLM chaining and routing
├── memory-demo.ts          # Memory management
├── streaming-demo.ts       # Streaming features
├── advanced-tools.ts       # Advanced tool usage
├── comprehensive-demo.ts   # Interactive comprehensive demo
└── utils/
    ├── demo-helpers.ts     # Demo utility functions
    ├── mock-data.ts        # Mock data for demos
    └── logger.ts           # Enhanced logging
```

## Key Concepts

### LLM Chaining
Litechain allows you to chain multiple LLMs together with automatic routing:

```typescript
// Set up LLMs with routing rules
entryLLM.systemprompt = "For billing issues, respond with: [TRANSFER:BILLING]";
entryLLM.connect({ BILLING: billingLLM });

// Automatic routing happens based on LLM responses
const response = await entryLLM.invoke("I want a refund");
```

### Memory Integration
Multiple memory types for different use cases:

```typescript
// Chat memory for conversation history
const chatLLM = litechain.llm.openai({ 
  apiKey: "...", 
  model: "gpt-4",
  memoryConfig: 'chat' 
});

// Vector memory for semantic search
const vectorLLM = litechain.llm.openai({ 
  apiKey: "...", 
  model: "gpt-4",
  memoryConfig: 'vector' 
});
```

### Streaming Support
Built-in streaming with easy setup:

```typescript
const response = await llm.stream("Tell me a story", {
  onChunk: (chunk) => process.stdout.write(chunk.delta),
  onComplete: (content) => console.log('\nComplete!')
});
```

## Best Practices

1. **Error Handling**: Always handle potential errors in LLM responses
2. **Memory Management**: Choose appropriate memory types for your use case
3. **Tool Design**: Keep tools focused and well-documented
4. **State Monitoring**: Use built-in debugging tools for development

## Next Steps

After running the demos, explore:
- Custom memory implementations
- Advanced tool compositions
- Production deployment patterns
- Performance optimization techniques
