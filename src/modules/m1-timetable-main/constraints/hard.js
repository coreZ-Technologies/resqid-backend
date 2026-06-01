/**
 * Hard constraints — engine rejects any assignment that violates these.
 * Each function returns { ok: boolean, reason?: string }
 */

/**
 * No teacher assigned to two slots at the same time.
 */
export function noTeacherDoubleBook(assignment, existing) {
  const clash = existing.find(
    (e) =>
      e.teacherId === assignment.teacherId &&
      e.day === assignment.day &&
      e.period === assignment.period &&
      e.id !== assignment.id
  );
  if (clash)
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} double-booked on day ${assignment.day} period ${assignment.period}`,
    };
  return { ok: true };
}

/**
 * No class assigned to two slots at the same time.
 */
export function noClassDoubleBook(assignment, existing) {
  const clash = existing.find(
    (e) =>
      e.classId === assignment.classId &&
      e.day === assignment.day &&
      e.period === assignment.period &&
      e.id !== assignment.id
  );
  if (clash)
    return {
      ok: false,
      reason: `Class ${assignment.classId} double-booked on day ${assignment.day} period ${assignment.period}`,
    };
  return { ok: true };
}

/**
 * No room used by two classes at the same time.
 */
export function noRoomDoubleBook(assignment, existing) {
  if (!assignment.roomId) return { ok: true };
  const clash = existing.find(
    (e) =>
      e.roomId === assignment.roomId &&
      e.day === assignment.day &&
      e.period === assignment.period &&
      e.id !== assignment.id
  );
  if (clash)
    return {
      ok: false,
      reason: `Room ${assignment.roomId} double-booked on day ${assignment.day} period ${assignment.period}`,
    };
  return { ok: true };
}

/**
 * Assignment must not fall on a break period.
 */
export function notInBreakSlot(assignment, schoolConfig) {
  const isBreak = (schoolConfig.breaks || []).some((b) => b.period === assignment.period);
  if (isBreak) return { ok: false, reason: `Period ${assignment.period} is a break` };
  return { ok: true };
}

/**
 * Teacher must not exceed max daily load.
 */
export function teacherDailyLoadOk(assignment, existing, teacherConfig) {
  const maxDaily = teacherConfig.maxPeriodsPerDay ?? 8;
  const count = existing.filter(
    (e) => e.teacherId === assignment.teacherId && e.day === assignment.day
  ).length;
  if (count >= maxDaily)
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} exceeds daily load on day ${assignment.day}`,
    };
  return { ok: true };
}

/**
 * Teacher must not exceed max weekly load.
 */
export function teacherWeeklyLoadOk(assignment, existing, teacherConfig) {
  const maxWeekly = teacherConfig.maxPeriodsPerWeek ?? 40;
  const count = existing.filter((e) => e.teacherId === assignment.teacherId).length;
  if (count >= maxWeekly)
    return { ok: false, reason: `Teacher ${assignment.teacherId} exceeds weekly load` };
  return { ok: true };
}

/**
 * Part-time teachers must only be assigned within their available slots.
 */
export function partTimeWindowOk(assignment, teacherConfig) {
  if (!teacherConfig.isPartTime) return { ok: true };
  const allowed = teacherConfig.availableSlots || [];
  const ok = allowed.some((s) => s.day === assignment.day && s.period === assignment.period);
  if (!ok)
    return {
      ok: false,
      reason: `Part-time teacher ${assignment.teacherId} not available at day ${assignment.day} period ${assignment.period}`,
    };
  return { ok: true };
}

/**
 * Teacher must not be assigned on leave dates.
 */
export function teacherNotOnLeave(assignment, teacherConfig) {
  const leaveDays = teacherConfig.leaveDays || [];
  if (leaveDays.includes(assignment.day)) {
    return {
      ok: false,
      reason: `Teacher ${assignment.teacherId} is on leave on day ${assignment.day}`,
    };
  }
  return { ok: true };
}

/**
 * Run all hard constraints. Returns first failure or ok.
 */
export function checkAll(assignment, existing, schoolConfig, teacherConfig) {
  const checks = [
    noTeacherDoubleBook(assignment, existing),
    noClassDoubleBook(assignment, existing),
    noRoomDoubleBook(assignment, existing),
    notInBreakSlot(assignment, schoolConfig),
    teacherDailyLoadOk(assignment, existing, teacherConfig),
    teacherWeeklyLoadOk(assignment, existing, teacherConfig),
    partTimeWindowOk(assignment, teacherConfig),
    teacherNotOnLeave(assignment, teacherConfig),
  ];
  for (const result of checks) {
    if (!result.ok) return result;
  }
  return { ok: true };
}
