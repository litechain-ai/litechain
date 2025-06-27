/**
 * Streaming support types for Litechain
 */

export interface StreamChunk {
  content: string;
  delta: string;
  isComplete: boolean;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface StreamOptions {
  onChunk?: (chunk: StreamChunk) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: Error) => void;
}

export interface StreamResponse {
  stream: AsyncIterableIterator<StreamChunk>;
  fullContent: Promise<string>;
}

export type StreamHandler = (chunk: StreamChunk) => void;
