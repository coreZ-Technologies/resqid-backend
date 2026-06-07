// Add to existing schoolAdmin.routes.js

import * as scanLogCtrl from '#modules/scan-log/scanLog.controller.js';

// =============================================================================
// SCAN LOGS (Read-only for school admin)
// =============================================================================
router.get('/scans', authenticate, authorize(...ADMIN), scanLogCtrl.list);
router.get('/scans/stats', authenticate, authorize(...ADMIN), scanLogCtrl.stats);
router.get('/scans/:id', authenticate, authorize(...ADMIN), scanLogCtrl.getOne);
