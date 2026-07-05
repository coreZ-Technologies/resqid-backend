import { Router } from 'express';
import { getHealthStatus } from './health';
import { getMetrics } from './metrics';
const router = Router();

router.get('/health', async (req, res) => {
  const health = await getHealthStatus();
  const statusCode = health.healthy ? 200 : 503;
  res.status(statusCode).json({
    success: health.healthy,
    ...health,
  });
});

router.get('/metrics', (req, res) => {
  res.json({
    success: true,
    data: getMetrics(),
  });
});

export default router;
