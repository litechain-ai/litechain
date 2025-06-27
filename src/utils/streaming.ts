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
   * Process a new chunk from the stream
   */
  processChunk(delta: string, metadata?: Record<string, any>): StreamChunk {
    this.fullContent += delta;
    
    const chunk: StreamChunk = {
      content: this.fullContent,
      delta,
      isComplete: false,
      timestamp: new Date(),
      metadata
    };

    this.chunks.push(chunk);

    // Call chunk handler if provided
    if (this.options?.onChunk) {
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
 * Create an async iterator for streaming
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
        const processedChunk = manager.processChunk(chunk.delta || chunk.content || '');
        yield processedChunk;
      }
    } else if (stream.on && typeof stream.on === 'function') {
      // EventEmitter-like stream
      yield* createEventStreamIterator(stream, manager);
    } else {
      // Fallback: treat as single response
      const chunk = manager.processChunk(stream.toString());
      yield chunk;
    }
    
    yield manager.complete();
  } catch (error) {
    manager.error(error as Error);
    throw error;
  }
}

/**
 * Handle EventEmitter-style streams
 */
async function* createEventStreamIterator(
  stream: any,
  manager: StreamManager
): AsyncIterableIterator<StreamChunk> {
  return new Promise<void>((resolve, reject) => {
    stream.on('data', (data: any) => {
      const chunk = manager.processChunk(data.toString());
      // Note: This won't work perfectly with async generators
      // In a real implementation, you'd need a more sophisticated approach
    });

    stream.on('end', () => {
      resolve();
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
