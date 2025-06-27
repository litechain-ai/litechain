import { v4 as uuidv4 } from 'uuid';
import { Memory, MemoryEntry, ConversationMemory, MemoryStorage } from '../types/memory';
import { FileMemoryStorage } from './storage';

/**
 * Chat memory implementation that stores conversation history
 */
export class ChatMemory implements Memory {
  public type = 'chat';
  private storage: MemoryStorage;
  private sessionId: string;
  private maxMessages: number;
  private conversationMemory: ConversationMemory;

  constructor(
    sessionId?: string, 
    maxMessages: number = 100, 
    storage?: MemoryStorage
  ) {
    this.sessionId = sessionId || uuidv4();
    this.maxMessages = maxMessages;
    this.storage = storage || new FileMemoryStorage();
    this.conversationMemory = {
      messages: [],
      maxMessages: this.maxMessages
    };
    this.loadMemory();
  }

  private async loadMemory(): Promise<void> {
    try {
      const stored = await this.storage.load(`chat_${this.sessionId}`);
      if (stored) {
        this.conversationMemory = {
          ...stored,
          messages: stored.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        };
      }
    } catch (error) {
      console.warn('Failed to load chat memory:', error);
    }
  }

  private async saveMemory(): Promise<void> {
    try {
      await this.storage.save(`chat_${this.sessionId}`, this.conversationMemory);
    } catch (error) {
      console.warn('Failed to save chat memory:', error);
    }
  }

  private trimMessages(): void {
    if (this.conversationMemory.messages.length > this.maxMessages) {
      const removed = this.conversationMemory.messages.splice(
        0, 
        this.conversationMemory.messages.length - this.maxMessages
      );
      
      // Create a summary of removed messages if needed
      if (removed.length > 0 && !this.conversationMemory.summary) {
        this.conversationMemory.summary = `Previous conversation included ${removed.length} messages from ${removed[0].timestamp} to ${removed[removed.length - 1].timestamp}`;
      }
    }
  }

  async store(entry: MemoryEntry): Promise<void> {
    // Convert MemoryEntry to conversation message format
    const message = {
      role: entry.metadata?.role || 'user' as const,
      content: entry.content,
      timestamp: entry.timestamp
    };

    this.conversationMemory.messages.push(message);
    this.trimMessages();
    await this.saveMemory();
  }

  async retrieve(query?: string, limit?: number): Promise<MemoryEntry[]> {
    const messages = limit 
      ? this.conversationMemory.messages.slice(-limit)
      : this.conversationMemory.messages;

    return messages.map(msg => ({
      id: uuidv4(),
      content: msg.content,
      timestamp: msg.timestamp,
      metadata: { role: msg.role }
    }));
  }

  async clear(): Promise<void> {
    this.conversationMemory = {
      messages: [],
      maxMessages: this.maxMessages
    };
    await this.storage.delete(`chat_${this.sessionId}`);
  }

  async summary(): Promise<string> {
    if (this.conversationMemory.summary) {
      return this.conversationMemory.summary;
    }

    if (this.conversationMemory.messages.length === 0) {
      return 'No conversation history';
    }

    const messageCount = this.conversationMemory.messages.length;
    const firstMessage = this.conversationMemory.messages[0];
    const lastMessage = this.conversationMemory.messages[messageCount - 1];

    return `Conversation with ${messageCount} messages from ${firstMessage.timestamp.toLocaleString()} to ${lastMessage.timestamp.toLocaleString()}`;
  }

  /**
   * Get conversation history in LLM message format
   */
  getConversationHistory(): Array<{ role: string; content: string }> {
    return this.conversationMemory.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Add system message or summary to memory
   */
  async addSystemMessage(content: string): Promise<void> {
    const entry: MemoryEntry = {
      id: uuidv4(),
      content,
      timestamp: new Date(),
      metadata: { role: 'system' }
    };
    await this.store(entry);
  }
}
