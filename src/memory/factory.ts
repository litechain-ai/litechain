import { Memory, MemoryConfig, FileMemoryConfig, RedisMemoryConfig, VectorMemoryConfig } from '../types/memory';
import { ChatMemory } from './chat';
import { SimpleVectorMemory } from './vector';
import { FileMemoryStorage, InMemoryStorage } from './storage';

/**
 * Factory function to create memory instances based on configuration
 */
export function createMemory(config: MemoryConfig, sessionId?: string): Memory {
  if (typeof config === 'string') {
    switch (config) {
      case 'chat':
        return new ChatMemory(sessionId);
      case 'vector':
        return new SimpleVectorMemory(sessionId);
      default:
        throw new Error(`Unknown memory type: ${config}`);
    }
  }

  // Handle object configurations
  switch (config.type) {
    case 'file':
      return new ChatMemory(
        sessionId, 
        100, // default max messages
        new FileMemoryStorage((config as FileMemoryConfig).path)
      );
    
    case 'redis':
      // TODO: Implement Redis storage
      throw new Error('Redis memory not yet implemented');
    
    case 'vector':
      const vectorConfig = config as VectorMemoryConfig;
      if (vectorConfig.provider === 'local') {
        return new SimpleVectorMemory(sessionId);
      }
      throw new Error(`Vector provider ${vectorConfig.provider} not yet implemented`);
    
    default:
      throw new Error(`Unknown memory configuration: ${JSON.stringify(config)}`);
  }
}

/**
 * Hybrid memory that combines chat and vector memory
 */
export class HybridMemory implements Memory {
  public type = 'hybrid';
  private chatMemory: ChatMemory;
  private vectorMemory: SimpleVectorMemory;

  constructor(sessionId?: string) {
    this.chatMemory = new ChatMemory(sessionId, 50); // Smaller chat history
    this.vectorMemory = new SimpleVectorMemory(sessionId);
  }

  async store(entry: any): Promise<void> {
    // Store in both memories
    await Promise.all([
      this.chatMemory.store(entry),
      this.vectorMemory.store(entry)
    ]);
  }

  async retrieve(query?: string, limit?: number): Promise<any[]> {
    if (!query) {
      // Return recent chat history if no query
      return this.chatMemory.retrieve(query, limit);
    }

    // Get both vector results and recent chat
    const [vectorResults, chatResults] = await Promise.all([
      this.vectorMemory.retrieve(query, Math.floor((limit || 10) * 0.7)),
      this.chatMemory.retrieve(undefined, Math.floor((limit || 10) * 0.3))
    ]);

    // Combine and deduplicate
    const combined = [...vectorResults, ...chatResults];
    const unique = combined.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );

    return unique.slice(0, limit || 10);
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.chatMemory.clear(),
      this.vectorMemory.clear()
    ]);
  }

  async summary(): Promise<string> {
    const [chatSummary, vectorSummary] = await Promise.all([
      this.chatMemory.summary(),
      this.vectorMemory.summary()
    ]);
    
    return `Hybrid Memory:\n- Chat: ${chatSummary}\n- Vector: ${vectorSummary}`;
  }
}
