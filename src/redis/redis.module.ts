import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Mark as global-scope
 * Use Inject('RedisService') to inject into any serivce without
 * explicitly importing outside the service's module file.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
