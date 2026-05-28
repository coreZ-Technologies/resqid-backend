// =============================================================================
// hpp.middleware.js — RESQID
//
// HTTP Parameter Pollution prevention.
// Prevents ?role=PARENT&role=SUPER_ADMIN type attacks.
// =============================================================================

import hpp from 'hpp';

export const hppProtection = hpp({
  whitelist: ['ids', 'status', 'type', 'modules', 'roles'],
});
