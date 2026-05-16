import { Injectable, Logger } from '@nestjs/common';
import { cachePrefixes } from './cache-keys';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly prefix = 'peblo:';

  constructor(private readonly redis: RedisService) {}

  isEnabled(): boolean {
    return this.redis.isEnabled();
  }

  async get<T>(key: string): Promise<T | null> {
    const client = this.redis.getClient();
    if (!client) return null;
    try {
      const raw = await client.get(this.prefixed(key));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Cache get failed for ${key}`, err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const client = this.redis.getClient();
    if (!client) return;
    try {
      await client.set(this.prefixed(key), JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache set failed for ${key}`, err instanceof Error ? err.message : String(err));
    }
  }

  async del(key: string): Promise<void> {
    const client = this.redis.getClient();
    if (!client) return;
    try {
      await client.del(this.prefixed(key));
    } catch {
      /* ignore */
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    const client = this.redis.getClient();
    if (!client) return;
    const match = this.prefixed(prefix);
    try {
      let cursor = '0';
      do {
        const [next, keys] = await client.scan(cursor, 'MATCH', `${match}*`, 'COUNT', 100);
        cursor = next;
        if (keys.length) {
          await client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      this.logger.warn(`Cache delByPrefix failed for ${prefix}`, err instanceof Error ? err.message : String(err));
    }
  }

  async invalidateWorkspace(workspaceId: string): Promise<void> {
    await Promise.all(cachePrefixes.workspace(workspaceId).map((p) => this.delByPrefix(p)));
  }

  private prefixed(key: string): string {
    return `${this.prefix}${key}`;
  }
}
