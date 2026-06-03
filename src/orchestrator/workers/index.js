// orchestrator/workers/index.js — RESQID
//
// RAILWAY (always on):
//   WORKER_ROLE=emergency     → EmergencyWorker only
//   WORKER_ROLE=notification  → NotificationWorker only
//   WORKER_ROLE=attendance    → AttendanceWorker only
//   WORKER_ROLE=timetable     → Timetable workers (generate, crisis, validate, swap, bulk)
//   WORKER_ROLE=all           → All workers

process.env.WORKER_PROCESS = 'true';

import { initializeInfrastructure } from '#infrastructure/infrastructure.index.js';
import { startEmergencyWorker, stopEmergencyWorker } from './emergency.worker.js';
import { startNotificationWorker, stopNotificationWorker } from './notification.worker.js';
import { startScanWorker, stopScanWorker } from './scan.worker.js';
import { startMaintenanceWorker, stopMaintenanceWorker } from './maintenance.worker.js';
import { startAttendanceWorker, stopAttendanceWorker } from './attendance.worker.js';
import { startGenerateWorker } from './generate.worker.js';
import { startCrisisWorker } from './crisis.worker.js';
import { startValidateWorker } from './validate.worker.js';
import { startSwapWorker } from './swap.worker.js';
import { startBulkUploadWorker } from './bulkUpload.worker.js';
import { closeAllQueues } from '../queues/queue.config.js';
import { closeQueueConnection } from '../queues/queue.connection.js';
import { flushDlqSlackBatch } from '../dlq/dlq.handler.js';
import { logger } from '#config/logger.js';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[97m',
  gray: '\x1b[90m',
  orange: '\x1b[38;5;208m',
  mint: '\x1b[38;5;121m',
  coral: '\x1b[38;5;203m',
  sky: '\x1b[38;5;117m',
  amber: '\x1b[38;5;214m',
  lime: '\x1b[38;5;154m',
  pink: '\x1b[38;5;205m',
  teal: '\x1b[38;5;51m',
  purple: '\x1b[38;5;141m',
  rose: '\x1b[38;5;211m',
};

const ok = `${c.green}${c.bold}✓${c.reset}`;
const fail = `${c.red}${c.bold}✗${c.reset}`;
const pad = (s, n) => String(s).padEnd(n);

const ROLE = (process.env.WORKER_ROLE ?? 'all').toLowerCase();

// WORKER REGISTRY

const ALL_WORKERS = [
  // ── Core (Always On) ─────────────────────────────────────────────────────
  {
    name: 'EmergencyWorker',
    queue: 'emergency_queue',
    conc: 10,
    roles: ['all', 'emergency'],
    col: c.coral,
    desc: 'QR scan events · parent alerts',
    start: startEmergencyWorker,
    stop: stopEmergencyWorker,
  },
  {
    name: 'NotificationWorker',
    queue: 'notification_queue',
    conc: 5,
    roles: ['all', 'notification'],
    col: c.sky,
    desc: 'Email · SMS · Push dispatch',
    start: startNotificationWorker,
    stop: stopNotificationWorker,
  },
  {
    name: 'AttendanceWorker',
    queue: 'attendance_bulk_queue',
    conc: 3,
    roles: ['all', 'attendance'],
    col: c.lime,
    desc: 'Bulk attendance sync from ESP32 devices',
    start: startAttendanceWorker,
    stop: stopAttendanceWorker,
  },

  // ── Timetable Workers ────────────────────────────────────────────────────
  {
    name: 'GenerateWorker',
    queue: 'timetable_generate_queue',
    conc: 2,
    roles: ['all', 'timetable'],
    col: c.teal,
    desc: 'Timetable generation solver (CSP backtracking)',
    start: startGenerateWorker,
    stop: async (w) => {
      if (w) await w.close();
    },
  },
  {
    name: 'CrisisWorker',
    queue: 'crisis_handling_queue',
    conc: 5,
    roles: ['all', 'timetable'],
    col: c.coral,
    desc: 'Teacher absence · room unavailability · substitutions',
    start: startCrisisWorker,
    stop: async (w) => {
      if (w) await w.close();
    },
  },
  {
    name: 'ValidateWorker',
    queue: 'timetable_validate_queue',
    conc: 3,
    roles: ['all', 'timetable'],
    col: c.purple,
    desc: 'Timetable validation · scoring · reports',
    start: startValidateWorker,
    stop: async (w) => {
      if (w) await w.close();
    },
  },
  {
    name: 'SwapWorker',
    queue: 'timetable_swap_queue',
    conc: 3,
    roles: ['all', 'timetable'],
    col: c.amber,
    desc: 'Manual slot swaps · reassignments',
    start: startSwapWorker,
    stop: async (w) => {
      if (w) await w.close();
    },
  },
  {
    name: 'BulkUploadWorker',
    queue: 'timetable_bulk_upload_queue',
    conc: 2,
    roles: ['all', 'timetable'],
    col: c.rose,
    desc: 'Excel/CSV bulk upload processing',
    start: startBulkUploadWorker,
    stop: async (w) => {
      if (w) await w.close();
    },
  },

  // ── Background ───────────────────────────────────────────────────────────
  {
    name: 'ScanWorker',
    queue: 'setInterval/60s',
    conc: 1,
    roles: ['all'],
    col: c.mint,
    desc: 'Drain Redis scan logs → Postgres',
    start: startScanWorker,
    stop: stopScanWorker,
  },
  {
    name: 'MaintenanceWorker',
    queue: 'setInterval/24h',
    conc: 1,
    roles: ['all'],
    col: c.gray,
    desc: 'Token expiry · session cleanup · DB vacuum',
    start: startMaintenanceWorker,
    stop: stopMaintenanceWorker,
  },
];

const ACTIVE = ALL_WORKERS.filter((w) => w.roles.includes(ROLE));

// Track running worker instances for shutdown
const _runningWorkers = [];

// BANNER

function printBanner() {
  const W = 64;
  const hl = c.amber;
  const box = { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║', ml: '╠', mr: '╣' };
  const row = (text = '') => {
    const visible = text.replace(/\x1b\[[0-9;]*m/g, '');
    const p = W - visible.length;
    return `${hl}${box.v}${c.reset}${text}${' '.repeat(Math.max(0, p))}${hl}${box.v}${c.reset}`;
  };
  const divider = `${hl}${box.ml}${box.h.repeat(W)}${box.mr}${c.reset}`;

  console.log('');
  console.log(`${hl}${box.tl}${box.h.repeat(W)}${box.tr}${c.reset}`);
  console.log(row());
  console.log(row(`  ${c.bold}${c.white}⚙  RESQID${c.reset}${c.dim}  by coreZ Technologies`));
  console.log(row(`  ${c.dim}QR-based Student Emergency Identity System`));
  console.log(row());
  console.log(divider);
  console.log(row());
  console.log(
    row(
      `  ${c.amber}${c.bold}WORKER PROCESS${c.reset}  ${c.gray}·${c.reset}  ${c.dim}BullMQ  ·  Redis  ·  PostgreSQL${c.reset}`
    )
  );
  console.log(
    row(
      `  ${c.dim}ROLE=${c.reset}${c.amber}${c.bold}${ROLE.toUpperCase()}${c.reset}  ${c.gray}·${c.reset}  ${c.dim}${ACTIVE.length} worker${ACTIVE.length !== 1 ? 's' : ''} running${c.reset}`
    )
  );
  console.log(row());
  console.log(`${hl}${box.bl}${box.h.repeat(W)}${box.br}${c.reset}`);
  console.log('');
}

function printTopology() {
  const W = 72;
  const SEP = `  ${c.gray}${'─'.repeat(W)}${c.reset}`;

  console.log(`\n${SEP}`);
  console.log(`  ${c.bold}${c.cyan}Worker Topology${c.reset}`);
  console.log(SEP);
  console.log(`  ${c.dim}${'Worker'.padEnd(26)} ${'Queue'.padEnd(28)} Conc${c.reset}`);
  console.log(SEP);

  ALL_WORKERS.forEach((w) => {
    const isActive = ACTIVE.some((a) => a.name === w.name);
    const dot = isActive ? `${w.col}●${c.reset}` : `${c.gray}○${c.reset}`;
    const name = isActive
      ? `${w.col}${c.bold}${pad(w.name, 24)}${c.reset}`
      : `${c.gray}${pad(w.name, 24)}${c.reset}`;
    console.log(
      `  ${dot}  ${name}${c.dim}${pad(w.queue, 28)}${c.reset}${c.gray}×${w.conc}${c.reset}`
    );
  });

  console.log(SEP);
  console.log('');
}

// DLQ FLUSH

let _dlqFlushInterval = null;

const startDlqFlush = () => {
  _dlqFlushInterval = setInterval(
    async () => {
      try {
        await flushDlqSlackBatch();
      } catch (err) {
        logger.error({ err: err.message }, '[workers] DLQ flush failed');
      }
    },
    60 * 60 * 1000
  );
  if (_dlqFlushInterval.unref) _dlqFlushInterval.unref();
};

const stopDlqFlush = () => {
  if (_dlqFlushInterval) {
    clearInterval(_dlqFlushInterval);
    _dlqFlushInterval = null;
  }
};

// GRACEFUL SHUTDOWN

const gracefulShutdown = async (signal) => {
  console.log(`\n  ${c.yellow}⚡ ${signal} — draining workers…${c.reset}`);
  logger.info({ signal }, '[workers] Graceful shutdown');

  stopDlqFlush();

  try {
    // Stop all running workers
    await Promise.allSettled(
      _runningWorkers.map(async (w) => {
        try {
          await w.stop(w.instance);
        } catch (err) {
          logger.error({ worker: w.name, err: err.message }, '[workers] Stop error');
        }
      })
    );

    await closeAllQueues();
    await closeQueueConnection();
    console.log(
      `\n  ${ok}  ${c.bold}${c.green}All workers drained — shutdown complete${c.reset}\n`
    );
    logger.info('[workers] Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error({ err: err.message }, '[workers] Shutdown error');
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception in worker process');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection in worker process');
  process.exit(1);
});

// START

export const startWorkers = async () => {
  printBanner();
  printTopology();

  if (ACTIVE.length === 0) {
    console.error(`\n  ${fail}  ${c.red}Unknown WORKER_ROLE="${ROLE}"${c.reset}`);
    console.error(
      `  ${c.dim}Valid: all · emergency · notification · attendance · timetable${c.reset}\n`
    );
    process.exit(1);
  }

  await initializeInfrastructure({
    cache: {},
    email: {},
    push: {},
    sms: {},
    storage: {},
  });

  logger.info({ role: ROLE, count: ACTIVE.length }, '[workers] Starting workers');

  // Start workers and track instances
  for (const w of ACTIVE) {
    const instance = w.start();
    _runningWorkers.push({ name: w.name, instance, stop: w.stop });
  }

  startDlqFlush();

  logger.info({ workers: ACTIVE.map((w) => w.name) }, '[workers] Workers started');
  console.log(
    `\n  ${ok}  ${c.bold}${c.green}${ACTIVE.length} worker${ACTIVE.length !== 1 ? 's' : ''} running${c.reset}  ${c.dim}Waiting for jobs…${c.reset}\n`
  );
};

// Auto-start when executed directly
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __main = process.argv[1] && fileURLToPath(`file://${process.argv[1]}`);
if (__main === __filename) {
  startWorkers();
}
