/**
 * Demo helper utilities for Litechain comprehensive demo
 */

export class DemoLogger {
  private static colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  };

  static section(title: string) {
    console.log(`\n${this.colors.cyan}${this.colors.bright}🚀 ${title}${this.colors.reset}`);
    console.log(`${this.colors.cyan}${'='.repeat(title.length + 3)}${this.colors.reset}\n`);
  }

  static step(message: string) {
    console.log(`${this.colors.blue}📝 ${message}${this.colors.reset}`);
  }

  static success(message: string) {
    console.log(`${this.colors.green}✅ ${message}${this.colors.reset}`);
  }

  static error(message: string) {
    console.log(`${this.colors.red}❌ ${message}${this.colors.reset}`);
  }

  static warning(message: string) {
    console.log(`${this.colors.yellow}⚠️  ${message}${this.colors.reset}`);
  }

  static info(message: string) {
    console.log(`${this.colors.white}ℹ️  ${message}${this.colors.reset}`);
  }

  static response(message: string) {
    console.log(`${this.colors.magenta}🤖 ${message}${this.colors.reset}`);
  }

  static user(message: string) {
    console.log(`${this.colors.cyan}👤 ${message}${this.colors.reset}`);
  }

  static separator() {
    console.log(`${this.colors.dim}${'─'.repeat(60)}${this.colors.reset}`);
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function typeWriter(text: string, speed: number = 50): Promise<void> {
  for (const char of text) {
    process.stdout.write(char);
    await sleep(speed);
  }
  console.log(); // New line after typing
}

export function formatConversationFlow(flow: any[]): string {
  return flow.map((entry, index) => {
    const transfer = entry.transferTarget ? ` → ${entry.transferTarget}` : '';
    return `  ${index + 1}. [${entry.timestamp.toLocaleTimeString()}] ${entry.llmName}: "${entry.response.substring(0, 100)}..."${transfer}`;
  }).join('\n');
}

export function formatTransferHistory(transfers: any[]): string {
  return transfers.map((transfer, index) => {
    return `  ${index + 1}. ${transfer.type.toUpperCase()} to ${transfer.target} at ${transfer.timestamp.toLocaleTimeString()}`;
  }).join('\n');
}

export async function runWithTimer<T>(
  operation: () => Promise<T>,
  label: string
): Promise<T> {
  const start = Date.now();
  DemoLogger.step(`Starting: ${label}`);
  
  try {
    const result = await operation();
    const duration = Date.now() - start;
    DemoLogger.success(`Completed: ${label} (${duration}ms)`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    DemoLogger.error(`Failed: ${label} (${duration}ms) - ${error}`);
    throw error;
  }
}

export function validateEnvironment(): boolean {
  const required = ['OPENAI_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    DemoLogger.error(`Missing required environment variables: ${missing.join(', ')}`);
    DemoLogger.info('Please copy env.example to .env and fill in your API keys');
    return false;
  }
  
  return true;
}

export class ProgressBar {
  private total: number;
  private current: number = 0;
  private width: number = 30;

  constructor(total: number) {
    this.total = total;
  }

  update(current: number, label?: string) {
    this.current = current;
    const percentage = Math.round((current / this.total) * 100);
    const filled = Math.round((current / this.total) * this.width);
    const empty = this.width - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const text = label ? ` ${label}` : '';
    
    process.stdout.write(`\r[${bar}] ${percentage}%${text}`);
    
    if (current >= this.total) {
      console.log(); // New line when complete
    }
  }
}

export function createDemoTools() {
  return [
    {
      name: "calculate",
      description: "Perform basic arithmetic calculations",
      parameters: {
        expression: {
          type: "string",
          description: "Mathematical expression to evaluate (e.g., '2 + 2', '10 * 5')"
        }
      },
      execute: async (parameters: any) => {
        try {
          // Simple and safe evaluation for demo purposes
          const expression = parameters.expression;
          const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
          const result = Function(`"use strict"; return (${sanitized})`)();
          return `${expression} = ${result}`;
        } catch (error) {
          return `Error evaluating expression: ${parameters.expression}`;
        }
      }
    },
    {
      name: "get_time",
      description: "Get the current date and time",
      parameters: {
        format: {
          type: "string",
          description: "Format: 'short', 'long', or 'iso'"
        }
      },
      execute: async (parameters: any) => {
        const format = parameters.format || 'short';
        const now = new Date();
        switch (format) {
          case 'long':
            return now.toLocaleString();
          case 'iso':
            return now.toISOString();
          default:
            return now.toLocaleTimeString();
        }
      }
    },
    {
      name: "generate_uuid",
      description: "Generate a random UUID",
      parameters: {},
      execute: async () => {
        return crypto.randomUUID();
      }
    },
    {
      name: "word_count",
      description: "Count words in a text",
      parameters: {
        text: {
          type: "string",
          description: "Text to count words in"
        }
      },
      execute: async (parameters: any) => {
        const text = parameters.text;
        const words = text.trim().split(/\s+/).filter((word: string) => word.length > 0);
        return `Word count: ${words.length}`;
      }
    }
  ];
}
