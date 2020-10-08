import * as config from 'config';
import { ClientOpts } from 'redis';

const redisGlobalConfig = config.get('redis');

export const redisConfig: ClientOpts = {
  port: process.env.REDIS_PORT || redisGlobalConfig.port,
  host: process.env.REDIS_HOST || redisGlobalConfig.host,
  password: process.env.REDIS_PASSWORD || redisGlobalConfig.password,
};
