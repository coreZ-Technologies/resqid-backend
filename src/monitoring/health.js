import { prisma } from '#config/prisma.js';
import { redis } from '#config/redis.js';

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  } catch (err) {
    return { status: 'down', error: err.message };
  }
}

async function checkRedis() {
  try {
    if (!redis || typeof redis.ping !== 'function') {
      return { status: 'not_configured' };
    }
    const pong = await redis.ping();
    return { status: pong === 'PONG' ? 'ok' : 'down' };
  } catch (err) {
    return { status: 'down', error: err.message };
  }
}

async function getHealthStatus() {
  const [db, cache] = await Promise.all([checkDatabase(), checkRedis()]);

  const isHealthy = db.status === 'ok';

  return {
    healthy: isHealthy,
    timeStamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      database: db,
      redis: cache,
    },
  };
}

export { checkDatabase, checkRedis, getHealthStatus };
