import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CacheService } from '../cache/cache.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly redis: RedisService,
    private readonly cache: CacheService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  async getHealth() {
    const redisConfigured = Boolean(process.env.REDIS_URL?.trim());
    const redisUp = redisConfigured ? await this.redis.ping() : false;
    return {
      status: 'ok',
      service: 'peblo-infinityos-api',
      redis: redisConfigured ? (redisUp ? 'up' : 'down') : 'disabled',
      cache: this.cache.isEnabled(),
      mailQueue: redisUp,
    };
  }
}
