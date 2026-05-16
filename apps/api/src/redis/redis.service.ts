import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL')?.trim();
    if (!url) {
      this.logger.log('REDIS_URL not set — cache and queues disabled');
      return;
    }

    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    try {
      await this.client.connect();
      this.logger.log('Redis connected');
    } catch (err) {
      this.logger.error(
        'Redis connection failed',
        err instanceof Error ? err.stack : String(err),
      );
      await this.client.quit().catch(() => undefined);
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
      this.client = null;
    }
  }

  isEnabled(): boolean {
    return this.client?.status === 'ready';
  }

  getClient(): Redis | null {
    return this.client?.status === 'ready' ? this.client : null;
  }

  async ping(): Promise<boolean> {
    const redis = this.getClient();
    if (!redis) return false;
    try {
      const pong = await redis.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }
}
