<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
// TODO: Add implementation
=======
>>>>>>> 968b0de918a92400b738d75ff34fed5a70d11b67
=======
>>>>>>> d8dcdbb0f5562330b20af4965a94bb6b45d79bea
>>>>>>> 2a55dd6fd25bf258ef26b2ee6e87c613a8887fbd
import { EmailProvider } from './email.provider.js';
import { BrevoAdapter } from './brevo.adapter.js';
import { ResendAdapter } from './resend.adapter.js';
import { SesAdapter } from './ses.adapter.js';

// ── Switch provider here ONLY ─────────────────────────
// 'brevo'  → current (free, no approval needed)
// 'resend' → next step
// 'ses'    → when AWS approves
const ACTIVE_PROVIDER = process.env.EMAIL_PROVIDER ?? 'brevo';
const ADAPTERS = {
  brevo: BrevoAdapter,
  resend: ResendAdapter,
  ses: SesAdapter,
};

let emailInstance = null;

export function initializeEmail(config = {}) {
  if (!emailInstance) {
    const ActiveAdapter = ADAPTERS[ACTIVE_PROVIDER];
    if (!ActiveAdapter) throw new Error(`[Email] Unknown provider: ${ACTIVE_PROVIDER}`);
    emailInstance = new ActiveAdapter(config);
  }
  return emailInstance;
}

export function getEmail() {
  if (!emailInstance) {
    throw new Error('[Email] Not initialized. Call initializeEmail() before use.');
  }
  return emailInstance;
}

export { EmailProvider };
