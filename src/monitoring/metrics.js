let requestCount = 0;
let errorCount = 0;
const routeHits = {};

function trackRequest(route) {
  requestCount += 1;
  routeHits[route] = (routeHits[route] || 0) + 1;
}

function trackError() {
  errorCount += 1;
}

function getMetrics() {
  const mem = process.memoryUsage();
  return {
    requests: {
      total: requestCount,
      errors: errorCount,
      byRoute: routeHits,
    },
    memory: {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    },
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

export { trackRequest, trackError, getMetrics };
