import { v4 as uuidv4 } from 'uuid';
import { Memory, MemoryEntry, VectorMemory, MemoryStorage } from '../types/memory';
import { FileMemoryStorage } from './storage';

/**
 * Simple vector memory implementation using basic text similarity
 * This is a basic implementation - in production you'd want to use proper embeddings
 */
export class SimpleVectorMemory implements Memory {
  public type = 'vector';
  private storage: MemoryStorage;
  private sessionId: string;
  private vectorMemory: VectorMemory;

  constructor(sessionId?: string, storage?: MemoryStorage) {
    this.sessionId = sessionId || uuidv4();
    this.storage = storage || new FileMemoryStorage();
    this.vectorMemory = {
      entries: [],
      similarity: this.calculateSimilarity.bind(this)
    };
    this.loadMemory();
  }

  private async loadMemory(): Promise<void> {
    try {
      const stored = await this.storage.load(`vector_${this.sessionId}`);
      if (stored) {
        this.vectorMemory = {
          ...stored,
          entries: stored.entries.map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          })),
          similarity: this.calculateSimilarity.bind(this)
        };
      }
    } catch (error) {
      console.warn('Failed to load vector memory:', error);
    }
  }

  private async saveMemory(): Promise<void> {
    try {
      const toSave = {
        ...this.vectorMemory,
        similarity: undefined // Don't serialize the function
      };
      await this.storage.save(`vector_${this.sessionId}`, toSave);
    } catch (error) {
      console.warn('Failed to save vector memory:', error);
    }
  }

  /**
   * Simple text similarity calculation using word overlap
   * In production, you'd want to use proper embeddings from OpenAI, etc.
   */
  private async calculateSimilarity(
    query: string, 
    entries: VectorMemory['entries']
  ): Promise<VectorMemory['entries']> {
    const queryWords = query.toLowerCase().split(/\s+/);
    
    const scored = entries.map(entry => {
      const entryWords = entry.content.toLowerCase().split(/\s+/);
      const intersection = queryWords.filter(word => entryWords.includes(word));
      const score = intersection.length / Math.max(queryWords.length, entryWords.length);
      
      return { ...entry, score };
    });

    return scored
      .filter(entry => entry.score > 0.1) // Minimum similarity threshold
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...entry }) => entry);
  }

  async store(entry: MemoryEntry): Promise<void> {
    const vectorEntry = {
      id: entry.id,
      content: entry.content,
      metadata: entry.metadata,
      timestamp: entry.timestamp,
      embedding: undefined // TODO: Generate real embeddings
    };

    this.vectorMemory.entries.push(vectorEntry);
    await this.saveMemory();
  }

  async retrieve(query?: string, limit: number = 10): Promise<MemoryEntry[]> {
    let entries = this.vectorMemory.entries;

    if (query && this.vectorMemory.similarity) {
      entries = await this.vectorMemory.similarity(query, entries);
    }

    return entries
      .slice(0, limit)
      .map(entry => ({
        id: entry.id,
        content: entry.content,
        timestamp: entry.timestamp,
        metadata: entry.metadata
      }));
  }

  async clear(): Promise<void> {
    this.vectorMemory = {
      entries: [],
      similarity: this.calculateSimilarity.bind(this)
    };
    await this.storage.delete(`vector_${this.sessionId}`);
  }

  async summary(): Promise<string> {
    const count = this.vectorMemory.entries.length;
    if (count === 0) {
      return 'No entries in vector memory';
    }

    const oldest = this.vectorMemory.entries.reduce((oldest, entry) => 
      entry.timestamp < oldest.timestamp ? entry : oldest
    );
    
    const newest = this.vectorMemory.entries.reduce((newest, entry) => 
      entry.timestamp > newest.timestamp ? entry : newest
    );

    return `Vector memory with ${count} entries from ${oldest.timestamp.toLocaleString()} to ${newest.timestamp.toLocaleString()}`;
  }
}
