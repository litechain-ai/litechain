import { StreamChunk, StreamOptions, StreamResponse } from '../types/streaming';

/**
 * Stream utility class to handle streaming responses
 */
export class StreamManager {
  private chunks: StreamChunk[] = [];
  private fullContent = '';
  private isComplete = false;

  constructor(private options?: StreamOptions) {}

  /**
   * Process a new chunk from the stream - token by token
   */
  processChunk(delta: string, metadata?: Record<string, any>): StreamChunk {
    // Only add non-empty deltas to avoid duplicate content
    if (delta) {
      this.fullContent += delta;
    }
    
    const chunk: StreamChunk = {
      content: this.fullContent,
      delta: delta, // Only the new token(s), not accumulated content
      isComplete: false,
      timestamp: new Date(),
      metadata
    };

    this.chunks.push(chunk);

    // Call chunk handler if provided - only if there's actual new content
    if (this.options?.onChunk && delta) {
      this.options.onChunk(chunk);
    }

    return chunk;
  }

  /**
   * Mark the stream as complete
   */
  complete(): StreamChunk {
    this.isComplete = true;
    
    const finalChunk: StreamChunk = {
      content: this.fullContent,
      delta: '',
      isComplete: true,
      timestamp: new Date()
    };

    this.chunks.push(finalChunk);

    // Call completion handler if provided
    if (this.options?.onComplete) {
      this.options.onComplete(this.fullContent);
    }

    return finalChunk;
  }

  /**
   * Handle stream error
   */
  error(error: Error): void {
    if (this.options?.onError) {
      this.options.onError(error);
    }
  }

  /**
   * Get all chunks
   */
  getChunks(): StreamChunk[] {
    return [...this.chunks];
  }

  /**
   * Get full content
   */
  getFullContent(): string {
    return this.fullContent;
  }

  /**
   * Check if stream is complete
   */
  getIsComplete(): boolean {
    return this.isComplete;
  }
}

/**
 * Create an async iterator for streaming - token by token
 */
export async function* createStreamIterator(
  streamPromise: Promise<any>,
  onChunk?: (chunk: StreamChunk) => void
): AsyncIterableIterator<StreamChunk> {
  const manager = new StreamManager({ onChunk });
  
  try {
    const stream = await streamPromise;
    
    // Handle different types of streams
    if (typeof stream[Symbol.asyncIterator] === 'function') {
      // Already an async iterator
      for await (const chunk of stream) {
        // Extract only the delta (new token) from the chunk
        const delta = extractDelta(chunk);
        if (delta) {
          const processedChunk = manager.processChunk(delta);
          yield processedChunk;
        }
      }
    } else if (stream.on && typeof stream.on === 'function') {
      // EventEmitter-like stream
      yield* createEventStreamIterator(stream, manager);
    } else {
      // Fallback: treat as single response
      const delta = stream.toString();
      if (delta) {
        const chunk = manager.processChunk(delta);
        yield chunk;
      }
    }
    
    yield manager.complete();
  } catch (error) {
    manager.error(error as Error);
    throw error;
  }
}

/**
 * Extract only the delta (new token) from a stream chunk
 */
function extractDelta(chunk: any): string {
  // Handle different chunk formats from various providers
  if (typeof chunk === 'string') {
    return chunk;
  }
  
  // OpenAI format
  if (chunk.choices && chunk.choices[0]?.delta?.content) {
    return chunk.choices[0].delta.content;
  }
  
  // Gemini format
  if (chunk.candidates && chunk.candidates[0]?.content?.parts?.[0]?.text) {
    return chunk.candidates[0].content.parts[0].text;
  }
  
  // Generic delta field
  if (chunk.delta) {
    return typeof chunk.delta === 'string' ? chunk.delta : chunk.delta.content || '';
  }
  
  // Generic content field (fallback)
  if (chunk.content) {
    return chunk.content;
  }
  
  // Text field
  if (chunk.text) {
    return chunk.text;
  }
  
  return '';
}

/**
 * Handle EventEmitter-style streams - token by token
 */
async function* createEventStreamIterator(
  stream: any,
  manager: StreamManager
): AsyncIterableIterator<StreamChunk> {
  return new Promise<AsyncIterableIterator<StreamChunk>>((resolve, reject) => {
    const chunks: StreamChunk[] = [];
    
    stream.on('data', (data: any) => {
      const delta = extractDelta(data);
      if (delta) {
        const chunk = manager.processChunk(delta);
        chunks.push(chunk);
      }
    });

    stream.on('end', () => {
      resolve((async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      })());
    });

    stream.on('error', (error: Error) => {
      manager.error(error);
      reject(error);
    });
  });
}

/**
 * Create a stream response wrapper
 */
export function createStreamResponse(
  streamPromise: Promise<any>,
  options?: StreamOptions
): StreamResponse {
  const stream = createStreamIterator(streamPromise, options?.onChunk);
  
  const fullContent = (async () => {
    let content = '';
    for await (const chunk of createStreamIterator(streamPromise)) {
      content = chunk.content;
      if (chunk.isComplete) break;
    }
    return content;
  })();

  return { stream, fullContent };
}
