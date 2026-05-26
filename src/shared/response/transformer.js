/**
 * Pick only specific keys from an object
 * Usage: pick(user, ['id', 'name', 'email'])
 */
export const pick = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});
};

/**
 * Omit specific keys from an object
 * Usage: omit(user, ['password', 'otp'])
 */
export const omit = (obj, keys) => {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key)));
};

// ─── RESQID Transformers ─────────────────────────────────────
export const transformSchool = (school) => {
  return omit(school, ['createdAt', 'updatedAt', 'deletedAt']);
};

export const transformStudent = (student) => {
  return omit(student, ['createdAt', 'updatedAt', 'deletedAt']);
};

export const transformParent = (parent) => {
  return omit(parent, ['otp', 'otpExpiresAt', 'refreshToken', 'createdAt', 'updatedAt']);
};

export const transformSubscription = (subscription) => {
  return omit(subscription, ['createdAt', 'updatedAt']);
};

export const transformAttendance = (record) => ({
  ...omit(record, ['updatedAt']),
  // paise → rupees for display
  ...(record.amountPaise !== undefined && {
    amountRupees: record.amountPaise / 100,
  }),
});

/**
 * Transform a list — apply any transformer to an array
 * Usage: transformList(students, transformStudent)
 */
export const transformList = (list, transformerFn) => {
  return list.map(transformerFn);
};
