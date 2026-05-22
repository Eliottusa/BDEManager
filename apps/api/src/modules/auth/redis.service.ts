import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
    });

    this.client.on('error', (err) => this.logger.error('Redis error', err.message));
    this.client.connect().catch((err) => this.logger.error('Redis connect failed', err.message));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try { return JSON.parse(value) as T; } catch { return value as unknown as T; }
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'PX', ttlMs);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length) await this.client.del(...keys);
  }
}
