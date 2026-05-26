// src/network/userAgent.js

/**
 * Parses User-Agent header into structured device/browser/os info.
 * No external dependency — pure regex.
 */

const parseBrowser = (ua) => {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  if (/MSIE|Trident/.test(ua)) return 'IE';
  return 'Unknown';
};

const parseOs = (ua) => {
  if (/Windows NT 10/.test(ua)) return 'Windows 10';
  if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1';
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
  // Detect RESQID React Native app specifically
  if (/RESQID\//.test(ua)) {
    const match = ua.match(/RESQID\/([\d.]+)/);
    return { name: 'RESQID App', version: match?.[1] || 'unknown' };
  }
  if (/Expo/.test(ua)) return { name: 'Expo Go', version: null };
  return null;
};

export const parseUserAgent = (req) => {
  const ua = req.headers['user-agent'] || '';

  if (!ua) {
    return {
      raw: null,
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown',
      app: null,
      isBot: false,
    };
  }

  const isBot = /bot|crawl|spider|slurp|mediapartners/i.test(ua);

  return {
    raw: ua,
    browser: parseBrowser(ua),
    os: parseOs(ua),
    device: parseDevice(ua),
    app: parseApp(ua),
    isBot,
  };
};
