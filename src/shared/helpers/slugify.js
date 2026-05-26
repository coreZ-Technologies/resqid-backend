// src/helpers/slugify.js

/**
 * Convert any string to a URL-safe slug
 * "St. Xavier's School" → "st-xaviers-school"
 */
export const slugify = (text) => {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // remove special chars except - and spaces
    .replace(/[\s_]+/g, '-') // spaces and underscores → hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
};

/**
 * Generate a school code from school name
 * "St. Xavier's High School, Kolkata" → "st-xaviers-high-school-kolkata"
 */
export const toSchoolSlug = (name) => slugify(name);

/**
 * Generate short code for school (used in QR, card prints)
 * "St. Xavier's High School" → "SXHS"
 */
export const toSchoolCode = (name) => {
  return name
    .replace(/[^a-zA-Z\s]/g, '') // letters and spaces only
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join('')
    .slice(0, 6); // max 6 chars
};

/**
 * Append a short unique suffix to avoid slug collisions
 * "st-xaviers-school" → "st-xaviers-school-k3x9"
 */
export const slugifyUnique = (text) => {
  const base = slugify(text);
  const suffix = Math.random().toString(36).slice(2, 6); // 4 random chars
  return `${base}-${suffix}`;
};
