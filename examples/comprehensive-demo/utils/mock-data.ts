/**
 * Mock data for Litechain demos
 */

export const customerServiceScenarios = [
  {
    category: "general",
    message: "Hello, I'm new to your service. Can you help me get started?",
    expectedRoute: "entry"
  },
  {
    category: "technical", 
    message: "My app keeps crashing when I try to upload files. Can you help?",
    expectedRoute: "tech"
  },
  {
    category: "billing",
    message: "I was charged twice for my subscription this month.",
    expectedRoute: "billing"
  },
  {
    category: "refund",
    message: "I want to cancel my subscription and get a full refund.",
    expectedRoute: "billing → human"
  },
  {
    category: "complex",
    message: "I can't access my account, and when I try to reset my password, it says my email doesn't exist, but I'm still being billed.",
    expectedRoute: "tech → billing"
  }
];

export const memoryTestData = [
  {
    role: "user",
    content: "I'm planning a trip to Japan next month.",
    timestamp: new Date('2024-01-15T10:00:00Z')
  },
  {
    role: "assistant", 
    content: "That's exciting! Japan in February is beautiful. Are you interested in winter activities or cultural experiences?",
    timestamp: new Date('2024-01-15T10:01:00Z')
  },
  {
    role: "user",
    content: "I love both! I'm particularly interested in visiting temples and maybe some hot springs.",
    timestamp: new Date('2024-01-15T10:02:00Z')
  },
  {
    role: "assistant",
    content: "Perfect! I'd recommend visiting Kyoto for temples like Kinkaku-ji and Fushimi Inari. For hot springs, consider Hakone or Beppu.",
    timestamp: new Date('2024-01-15T10:03:00Z')
  },
  {
    role: "user",
    content: "What about food recommendations?",
    timestamp: new Date('2024-01-15T10:04:00Z')
  }
];

export const streamingExamples = [
  {
    title: "Creative Writing",
    prompt: "Write a short story about a robot discovering emotions for the first time.",
    expectedLength: "medium"
  },
  {
    title: "Technical Explanation", 
    prompt: "Explain how machine learning works in simple terms that a 10-year-old could understand.",
    expectedLength: "long"
  },
  {
    title: "Code Generation",
    prompt: "Write a Python function that finds the longest palindrome in a string.",
    expectedLength: "short"
  },
  {
    title: "Recipe",
    prompt: "Give me a detailed recipe for making homemade pizza from scratch.",
    expectedLength: "long"
  }
];

export const toolChainExamples = [
  {
    description: "Mathematical Problem Solving",
    prompt: "I have 15 apples. I eat 3, give away 4, and buy 8 more. How many apples do I have now? Also, what time is it?",
    expectedTools: ["calculate", "get_time"]
  },
  {
    description: "Text Analysis",
    prompt: "Count the words in this sentence: 'The quick brown fox jumps over the lazy dog.' Then generate a UUID for reference.",
    expectedTools: ["word_count", "generate_uuid"]
  },
  {
    description: "Complex Calculation",
    prompt: "Calculate the area of a circle with radius 5 (π × r²), then tell me what time it is in ISO format.",
    expectedTools: ["calculate", "get_time"]
  }
];

export const systemPrompts = {
  entry: `You are a friendly customer service representative for TechCorp, a software company.

Your role is to:
- Greet customers warmly and understand their needs
- For technical issues, respond with: [TRANSFER:TECH]  
- For billing/payment issues, respond with: [TRANSFER:BILLING]
- For general questions, provide helpful information directly
- Keep responses concise and professional

Always be helpful and courteous.`,

  technical: `You are a technical support specialist for TechCorp.

Your expertise includes:
- Software troubleshooting and debugging
- Account access and authentication issues  
- App functionality and feature explanations
- System requirements and compatibility

If an issue requires billing/account changes, respond with: [TRANSFER:BILLING]
If an issue is too complex and needs human intervention, respond with: [ESCALATE:HUMAN]

Provide clear, step-by-step solutions.`,

  billing: `You are a billing specialist for TechCorp.

You handle:
- Payment processing and billing inquiries
- Subscription changes and cancellations
- Refund requests and account credits
- Plan upgrades and downgrades

For refund requests or complex billing disputes, respond with: [ESCALATE:HUMAN]
If technical issues are mentioned, respond with: [TRANSFER:TECH]

Be empathetic with billing concerns and offer solutions.`,

  creative: `You are a creative writing assistant specializing in storytelling and narrative development.

Your strengths:
- Character development and dialogue
- Plot structure and pacing
- Creative prompts and inspiration
- Writing style and voice guidance

Be imaginative, encouraging, and provide detailed creative responses.`,

  analyst: `You are a data analyst and research assistant.

Your capabilities:
- Data analysis and interpretation
- Research methodology and insights
- Statistical explanations and calculations
- Trend analysis and predictions

Provide analytical, fact-based responses with clear reasoning.`
};

export const conversationTemplates = {
  greeting: [
    "Hello! How can I help you today?",
    "Hi there! What can I assist you with?",
    "Welcome! How may I be of service?",
    "Good day! What brings you here today?"
  ],
  
  transfer: [
    "I'll connect you with our {department} team who can better assist you.",
    "Let me transfer you to {department} for specialized help.",
    "Our {department} specialist will take care of this for you."
  ],
  
  escalation: [
    "This requires special attention. I'm escalating this to our senior team.",
    "Let me get a supervisor involved to ensure this gets resolved properly.",
    "I'm bringing in additional help to handle this complex situation."
  ]
};
