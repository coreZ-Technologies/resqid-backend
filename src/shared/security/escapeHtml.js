// TODO: Add implementation
/**
 * escapeHtml.js
 *
 * Converts special HTML characters into their corresponding
 * HTML entities to prevent XSS attacks when rendering user
 * input in web pages or email templates.
 *
 * Used by:
 *   - sanitize.middleware.js (to clean incoming request data)
 *   - email/push/sms templates when inserting user‑provided content
 *   - any controller/service that builds dynamic HTML
 */

/**
 * Replace characters that have special meaning in HTML.
 * @param {string} str - The untrusted input string.
 * @returns {string} - Safe string for HTML context.
 */
export function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';

  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return str.replace(/[&<>"'`=/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Escape a string for use inside an HTML attribute (e.g., title, alt).
 * This is essentially the same as escapeHtml, but explicitly named
 * for clarity.
 */
export function escapeHtmlAttribute(str) {
  return escapeHtml(str);
}

/**
 * Escape a string for use inside a <script> block (JSON context).
 * This is a minimal implementation that prevents closing the script tag.
 * For full safety, use JSON.stringify() for actual data injection.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeScriptTag(str) {
  return str
    .replace(/<!--/g, '<\\!--')
    .replace(/<script>/gi, '\\x3Cscript>')
    .replace(/<\/script>/gi, '\\x3C/script>');
}

/**
 * Recursively escape all string values in an object.
 * Useful for sanitising the entire req.body.
 *
 * @param {object} obj
 * @returns {object}
 */
export function deepEscape(obj) {
  if (typeof obj === 'string') {
    return escapeHtml(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(deepEscape);
  }
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepEscape(value);
    }
    return result;
  }
  return obj;
}