// =============================================================================
// escapeHtml.js — RESQID
//
// Converts special HTML characters into HTML entities to prevent XSS attacks.
//
// Used by:
//   - xss.middleware.js      → sanitize incoming request data
//   - sanitize.middleware.js → clean request body/query/params
//   - email/push/sms templates → when inserting user-provided content
//   - any controller/service that builds dynamic HTML
// =============================================================================

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

const HTML_ESCAPE_REGEX = /[&<>"'`=/]/g;

// ─── Single Value Escaping ────────────────────────────────────────────────────

/**
 * Replace characters that have special meaning in HTML.
 *
 * @param {string} str - Untrusted input string
 * @returns {string} Safe string for HTML context
 */
export function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char]);
}

/**
 * Escape a string for use inside an HTML attribute (e.g., title, alt).
 */
export function escapeHtmlAttribute(str) {
  return escapeHtml(str);
}

/**
 * Escape a string for use inside a <script> block (JSON context).
 * Prevents closing the script tag.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeScriptTag(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<!--/g, '<\\!--')
    .replace(/<script>/gi, '\\x3Cscript>')
    .replace(/<\/script>/gi, '\\x3C/script>');
}

/**
 * Escape a string for use in CSS context.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeCss(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[<>"'`]/g, (char) => HTML_ESCAPE_MAP[char]);
}

/**
 * Escape a string for use in URL context.
 */
export function escapeUrl(str) {
  if (!str || typeof str !== 'string') return '';
  return encodeURIComponent(str);
}

// ─── Deep Escaping ────────────────────────────────────────────────────────────

/**
 * Recursively escape all string values in an object.
 * Used by xss.middleware.js to sanitize entire req.body.
 *
 * NOTE: This mutates strings but does NOT handle MongoDB $ operators.
 * Use sanitize.js for NoSQL injection prevention.
 *
 * @param {object|string|Array} obj
 * @returns {object|string|Array}
 */
export function deepEscape(obj) {
  if (typeof obj === 'string') {
    return escapeHtml(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(deepEscape);
  }
  if (obj && typeof obj === 'object') {
    // Skip null, Date, Buffer, etc.
    if (obj instanceof Date || Buffer.isBuffer(obj)) return obj;

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      // Escape both key and value
      const safeKey = escapeHtml(key);
      result[safeKey] = deepEscape(value);
    }
    return result;
  }
  return obj;
}

// ─── Unescape (for specific use cases) ────────────────────────────────────────

const HTML_UNESCAPE_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x2F;': '/',
  '&#x60;': '`',
  '&#x3D;': '=',
};

const HTML_UNESCAPE_REGEX = /&amp;|&lt;|&gt;|&quot;|&#39;|&#x2F;|&#x60;|&#x3D;/g;

/**
 * Unescape HTML entities back to original characters.
 * Use only when you need the original value after sanitization.
 */
export function unescapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(HTML_UNESCAPE_REGEX, (entity) => HTML_UNESCAPE_MAP[entity]);
}
