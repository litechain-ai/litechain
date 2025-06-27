import fs from 'fs/promises';
import path from 'path';
import { Memory, MemoryEntry, MemoryStorage } from '../types/memory';

/**
 * File-based memory storage implementation
 */
export class FileMemoryStorage implements MemoryStorage {
  private basePath: string;

  constructor(basePath: string = './memory') {
    this.basePath = basePath;
  }

  async save(key: string, data: any): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      const filePath = path.join(this.basePath, `${key}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      throw new Error(`Failed to save memory: ${error}`);
    }
  }

  async load(key: string): Promise<any> {
    try {
      const filePath = path.join(this.basePath, `${key}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null; // Return null if file doesn't exist
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = path.join(this.basePath, `${key}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore errors if file doesn't exist
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, `${key}.json`);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * In-memory storage implementation (for testing/development)
 */
export class InMemoryStorage implements MemoryStorage {
  private data: Map<string, any> = new Map();

  async save(key: string, data: any): Promise<void> {
    this.data.set(key, JSON.parse(JSON.stringify(data))); // Deep clone
  }

  async load(key: string): Promise<any> {
    return this.data.get(key) || null;
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.data.has(key);
  }
}
