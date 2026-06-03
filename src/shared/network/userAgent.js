// =============================================================================
// userAgent.js — RESQID
//
// Parses User-Agent header into structured device/browser/os info.
// No external dependency — pure regex.
// =============================================================================

const parseBrowser = (ua) => {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Brave/.test(ua)) return 'Brave';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  if (/MSIE|Trident/.test(ua)) return 'IE';
  return 'Unknown';
};

const parseOs = (ua) => {
  if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
  if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1';
  if (/Windows NT 6\.2/.test(ua)) return 'Windows 8';
  if (/Windows NT 6\.1/.test(ua)) return 'Windows 7';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Android/.test(ua)) {
    const match = ua.match(/Android ([\d.]+)/);
    return match ? `Android ${match[1]}` : 'Android';
  }
  if (/iPhone|iPad/.test(ua)) {
    const match = ua.match(/OS ([\d_]+)/);
    return match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  }
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
};

const parseDevice = (ua) => {
  if (/iPad/.test(ua)) return 'Tablet';
  if (/iPhone/.test(ua)) return 'Mobile';
  if (/Android/.test(ua)) {
    return /Mobile/.test(ua) ? 'Mobile' : 'Tablet';
  }
  if (/Mobile/.test(ua)) return 'Mobile';
  return 'Desktop';
};

const parseApp = (ua) => {
  if (/RESQID\//.test(ua)) {
    const match = ua.match(/RESQID\/([\d.]+)/);
    return { name: 'RESQID App', version: match?.[1] || 'unknown' };
  }
  if (/Expo/.test(ua)) return { name: 'Expo Go', version: null };
  return null;
};

/**
 * Parse User-Agent header into structured info.
 *
 * @param {Object} req - Express request
 * @returns {{ raw: string|null, browser: string, os: string, device: string, app: object|null, isBot: boolean, isMobile: boolean }}
 */
export const parseUserAgent = (req) => {
  const ua = req.headers?.['user-agent'] || '';

  if (!ua) {
    return {
      raw: null,
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown',
      app: null,
      isBot: false,
      isMobile: false,
    };
  }

  const isBot = /bot|crawl|spider|slurp|mediapartners|scanner|curl|wget/i.test(ua);
  const device = parseDevice(ua);

  return {
    raw: ua,
    browser: parseBrowser(ua),
    os: parseOs(ua),
    device,
    app: parseApp(ua),
    isBot,
    isMobile: device === 'Mobile',
    isDesktop: device === 'Desktop',
    isTablet: device === 'Tablet',
  };
};

/**
 * Get a human-readable device summary for audit logs.
 */
export const getDeviceSummary = (req) => {
  const ua = parseUserAgent(req);
  return `${ua.browser} on ${ua.os} (${ua.device})${ua.isBot ? ' [BOT]' : ''}`;
};
