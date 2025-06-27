/**
 * Memory support types for Litechain
 */

export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ConversationMemory {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
  }>;
  summary?: string;
  maxMessages?: number;
}

export interface VectorMemory {
  entries: Array<{
    id: string;
    content: string;
    embedding?: number[];
    metadata?: Record<string, any>;
    timestamp: Date;
  }>;
  similarity?: (query: string, entries: VectorMemory['entries']) => Promise<VectorMemory['entries']>;
}

export interface MemoryStorage {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface FileMemoryConfig {
  type: 'file';
  path: string;
}

export interface RedisMemoryConfig {
  type: 'redis';
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface VectorMemoryConfig {
  type: 'vector';
  provider: 'local' | 'pinecone' | 'chroma';
  config?: Record<string, any>;
}

export type MemoryConfig = 'chat' | 'vector' | FileMemoryConfig | RedisMemoryConfig | VectorMemoryConfig;

export interface Memory {
  type: string;
  store(entry: MemoryEntry): Promise<void>;
  retrieve(query?: string, limit?: number): Promise<MemoryEntry[]>;
  clear(): Promise<void>;
  summary?(): Promise<string>;
}
