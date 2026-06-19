// src/modules/settings/settings.service.js
import { SettingsRepository } from './settings.repository.js';
import { redis } from '#config/redis.js';
import { CACHE_KEYS, CACHE_TTL } from '#shared/constants/cache.js';
import { encryptObject, decryptObject } from '#shared/security/encryption.js';
import { ApiError } from '#shared/response/ApiError.js';
import { ROLES } from '#shared/constants/roles.js';
import _ from 'lodash'; // Ensure lodash is installed (it is in package.json)

// --- Default Configuration (Used when school has no settings) ---
const DEFAULT_SETTINGS = {
  school: {
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    currency: 'INR',
  },
  academic: {
    currentSession: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    currentTerm: 'Term 1',
    sessionStartDate: null,
    sessionEndDate: null,
    gradingSystem: 'PERCENTAGE',
  },
  attendance: {
    checkInStartTime: '08:00',
    checkInEndTime: '08:30',
    gracePeriodMinutes: 10,
    autoMarkAbsentAfterMinutes: 30,
    allowGeoFencing: false,
    geoFenceRadiusMeters: 150,
    enableQRScan: true,
    enableRFID: true,
  },
  security: {
    sessionTimeoutMinutes: 120,
    maxLoginAttempts: 5,
    requireTwoFactor: false,
    passwordMinLength: 8,
  },
  notifications: {
    enableEmail: true,
    enableSMS: true,
    enablePush: true,
    attendanceAlertToParents: true,
    emergencyBroadcastEnabled: true,
  },
  modules: {
    transport: false,
    library: false,
    hostel: false,
    inventory: false,
    fees: true,
  },
  integrations: {
    paymentGateway: 'RAZORPAY',
    razorpayKeyId: '',
    razorpaySecret: '', // This will be encrypted in DB
    smsProvider: 'TWILIO',
    smsApiKey: '', // This will be encrypted in DB
    emailProvider: 'SENDGRID',
    emailApiKey: '', // This will be encrypted in DB
  },
  uiPreferences: {
    theme: 'light',
    primaryColor: '#2563EB',
  },
};

export class SettingsService {
  constructor() {
    this.repository = new SettingsRepository();
  }

  // --- Helper: Mask secrets for frontend ---
  maskSecrets(config) {
    const masked = _.cloneDeep(config);
    if (masked.integrations) {
      if (masked.integrations.razorpaySecret) {
        const secret = masked.integrations.razorpaySecret;
        masked.integrations.razorpaySecret = secret.length > 4 ? secret.slice(0, 4) + '****' : '****';
      }
      if (masked.integrations.smsApiKey) {
        const key = masked.integrations.smsApiKey;
        masked.integrations.smsApiKey = key.length > 4 ? key.slice(0, 4) + '****' : '****';
      }
      if (masked.integrations.emailApiKey) {
        const key = masked.integrations.emailApiKey;
        masked.integrations.emailApiKey = key.length > 4 ? key.slice(0, 4) + '****' : '****';
      }
    }
    return masked;
  }

  // --- Get Settings (with Role Scoping & Caching) ---
  async getSettings(user) {
    const schoolId = user.schoolId;
    if (!schoolId) throw ApiError.tenantRequired();

    // Super Admin can pass ?schoolId=xxx to view any school
    let targetSchoolId = schoolId;
    if (user.role === ROLES.SUPER_ADMIN && user.querySchoolId) {
      targetSchoolId = user.querySchoolId;
    }

    const cacheKey = CACHE_KEYS.SCHOOL_SETTINGS(targetSchoolId);

    // 1. Try Redis Cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // If we cached the masked version (for frontend), return it.
        // But we cache the FULL decrypted version for internal use.
        // For frontend, we mask it again just in case.
        return this.maskSecrets(parsed);
      }
    } catch (err) {
      // Cache miss or error, proceed to DB
    }

    // 2. Fetch from DB
    let record = await this.repository.findBySchoolId(targetSchoolId);
    let config = { ...DEFAULT_SETTINGS };

    if (record && record.configEncrypted) {
      try {
        const decrypted = decryptObject(record.configEncrypted);
        config = _.merge(config, decrypted);
      } catch (err) {
        // If decryption fails, log but fallback to defaults
        console.error('Failed to decrypt settings for school:', targetSchoolId, err);
      }
    }

    // 3. Cache the FULL config (non-masked) for internal speed
    try {
      await redis.set(cacheKey, JSON.stringify(config), 'EX', CACHE_TTL.SCHOOL);
    } catch (err) {
      // Non-critical
    }

    // 4. Return MASKED config to the frontend
    return this.maskSecrets(config);
  }

  // --- Update Settings (Deep Merge + Encryption + Cache Clear) ---
  async updateSettings(user, updates) {
    const schoolId = user.schoolId;
    if (!schoolId) throw ApiError.tenantRequired();

    // Security: Only Admins can update settings
    if (![ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN].includes(user.role)) {
      throw new ApiError(403, 'Only admins can update settings');
    }

    // 1. Get current config
    const currentConfig = await this.getSettings(user); // This returns masked, but we need the raw DB one.
    // To avoid issues, fetch raw from DB directly.
    let record = await this.repository.findBySchoolId(schoolId);
    let rawConfig = { ...DEFAULT_SETTINGS };

    if (record && record.configEncrypted) {
      try {
        rawConfig = decryptObject(record.configEncrypted);
      } catch (e) {
        // Ignore, use defaults
      }
    }

    // 2. Deep Merge the updates (lodash handles nested objects perfectly)
    const newConfig = _.merge({}, rawConfig, updates);

    // 3. Encrypt the entire config blob before storing
    const encrypted = encryptObject(newConfig);

    // 4. Save to DB
    await this.repository.upsert(schoolId, encrypted, user.id || user.userId);

    // 5. Clear Redis Cache
    const cacheKey = CACHE_KEYS.SCHOOL_SETTINGS(schoolId);
    try {
      await redis.del(cacheKey);
    } catch (err) {
      // Non-critical
    }

    // 6. Return the newly updated masked config
    return this.maskSecrets(newConfig);
  }

  // --- Sync School Core Fields (if you want to update school.name, timezone etc.) ---
  async syncCoreSchoolFields(schoolId, updates) {
    // This is optional. You can call this if the user updates the school name/timezone
    // so it reflects in both the School table AND the settings cache.
    // For now, we keep settings separate. We'll merge them on the frontend.
  }
}