import Redis, { Cluster } from 'ioredis';
import { ENV } from './env.js';
import { logger } from './logger.js';
console.log('ENV.REDIS_TLS', ENV.REDIS_TLS);

function buildBaseOptions() {
  return {
    retryStrategy(times) {
      if (times > 20) {
        logger.fatal();
      }
    },
  };
}
