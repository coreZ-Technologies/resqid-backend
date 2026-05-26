import { prisma } from '#config/prisma.js';
import { redis } from '#config/redis.js';

const getSubscription = async (schoolId) => {
  const cacheKey = `subscription:${schoolId}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const subscription = await prisma.subscription.findUnique({
    where: { schoolId },
    select: {
      modules: true,
      validUntil: true,
    },
  });

  if (subscription) await redis.set(cacheKey, JSON.stringify(subscription), 'EX', 600);

  return subscription;
};

export const requireModule = (module) => {
    return async (req, res, next) => {
        const schoolId = req.user?.schoolId;

        if (!schoolId) return res.status(401,)
  };
};
