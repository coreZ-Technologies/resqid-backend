// =============================================================================
// orchestrator/workers/scan.worker.js — RESQID
//
// No BullMQ — plain setInterval for efficiency.
// 1. Sync DB IP blocks → Redis on startup + every 6h
// 2. Drain Redis scan logs → Postgres every 60s
// 3. Expire stale IP blocks every 6h
// =============================================================================

import { prisma } from '#config/prisma.js';
import { middlewareRedis as redis } from '#config/redis.js';
import { logger } from '#config/logger.js';

const DRAIN_INTERVAL_MS = 60_000;
const EXPIRE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DRAIN_BATCH_SIZE = 500;

let _drainInterval = null;
let _expireInterval = null;

// ─── Log Drain ────────────────────────────────────────────────────────────────

const runLogDrain = async () => {
  try {
    // Drain scan logs from Redis list
    const key = 'scan:log:queue';
    const pipeline = redis.pipeline();
    pipeline.lrange(key, 0, DRAIN_BATCH_SIZE - 1);
    pipeline.ltrim(key, DRAIN_BATCH_SIZE, -1);
    const results = await pipeline.exec();

    const entries = results[0][1] || [];
    if (!entries.length) return;

    const parsed = entries
      .map((e) => {
        try {
          return JSON.parse(e);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (parsed.length === 0) return;

    // Bulk insert to ScanLog table
    await prisma.scanLog.createMany({
      data: parsed.map((entry) => ({
        tokenId: entry.tokenId,
        schoolId: entry.schoolId,
        scannedAt: entry.scannedAt ? new Date(entry.scannedAt) : new Date(),
        result: entry.result || 'ACTIVE',
        ipAddress: entry.ipAddress || null,
        city: entry.city || null,
        device: entry.device || null,
        os: entry.os || null,
        isBot: entry.isBot || false,
      })),
      skipDuplicates: true,
    });

    logger.info({ count: parsed.length }, '[scan.worker] Logs drained');
  } catch (err) {
    logger.error({ err: err.message }, '[scan.worker] Log drain failed');
  }
};

// ─── IP Blocklist Sync ────────────────────────────────────────────────────────

export const syncIpBlocklistToRedis = async () => {
  try {
    const activeBlocks = await prisma.scanRateLimit.findMany({
      where: {
        blockedUntil: { gt: new Date() },
      },
      select: { identifier: true, blockedReason: true, blockedUntil: true },
    });

    if (!activeBlocks.length) return;

    const pipeline = redis.pipeline();
    for (const block of activeBlocks) {
      const key = `ipblock:${block.identifier}`;
      const ttl = Math.floor((block.blockedUntil.getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        pipeline.set(key, block.blockedReason || 'blocked', 'EX', ttl);
      }
    }
    await pipeline.exec();

    logger.info({ count: activeBlocks.length }, '[scan.worker] IP blocks synced to Redis');
  } catch (err) {
    logger.error({ err: err.message }, '[scan.worker] IP sync failed');
  }
};

const expireStaleBlocks = async () => {
  try {
    const result = await prisma.scanRateLimit.updateMany({
      where: { blockedUntil: { lt: new Date() }, blockedUntil: { not: null } },
      data: { blockedUntil: null, blockedReason: null },
    });
    if (result.count > 0) {
      logger.info({ count: result.count }, '[scan.worker] Expired blocks cleared');
    }
  } catch (err) {
    logger.error({ err: err.message }, '[scan.worker] Expire failed');
  }
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export const startScanWorker = async () => {
  logger.info('[scan.worker] Warming IP block cache...');
  await syncIpBlocklistToRedis();

  _drainInterval = setInterval(runLogDrain, DRAIN_INTERVAL_MS);
  if (_drainInterval.unref) _drainInterval.unref();

  _expireInterval = setInterval(expireStaleBlocks, EXPIRE_INTERVAL_MS);
  if (_expireInterval.unref) _expireInterval.unref();

  logger.info({ drainIntervalMs: DRAIN_INTERVAL_MS }, '[scan.worker] Started');
};

export const stopScanWorker = async () => {
  if (_drainInterval) {
    clearInterval(_drainInterval);
    _drainInterval = null;
  }
  if (_expireInterval) {
    clearInterval(_expireInterval);
    _expireInterval = null;
  }
  await runLogDrain();
  logger.info('[scan.worker] Stopped');
};
