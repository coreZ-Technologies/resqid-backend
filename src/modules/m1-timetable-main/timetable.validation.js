/**
 * timetable.validation.js
 * Input validation for timetable API endpoints.
 * Using plain JS validation — swap for Zod if you add it later.
 */

export function validateGenerateInput(body) {
  const errors = [];
  if (!body.templateId) errors.push('templateId is required');
  if (body.opts?.timeoutMs && typeof body.opts.timeoutMs !== 'number') {
    errors.push('opts.timeoutMs must be a number');
  }
  return errors;
}

export function validateCrisisInput(body) {
  const errors = [];
  const validTypes = ['TEACHER_ABSENT', 'ROOM_UNAVAILABLE', 'PARTIAL_RESCHEDULE'];
  if (!body.type) errors.push('type is required');
  if (!validTypes.includes(body.type)) errors.push(`type must be one of: ${validTypes.join(', ')}`);
  if (!body.payload) errors.push('payload is required');

  if (body.type === 'TEACHER_ABSENT') {
    if (!body.payload.teacherId) errors.push('payload.teacherId required for TEACHER_ABSENT');
    if (!body.payload.date) errors.push('payload.date required for TEACHER_ABSENT');
    if (!body.payload.timetableId) errors.push('payload.timetableId required for TEACHER_ABSENT');
  }
  if (body.type === 'ROOM_UNAVAILABLE') {
    if (!body.payload.roomId) errors.push('payload.roomId required for ROOM_UNAVAILABLE');
    if (!body.payload.timetableId) errors.push('payload.timetableId required for ROOM_UNAVAILABLE');
  }
  if (body.type === 'PARTIAL_RESCHEDULE') {
    if (!Array.isArray(body.payload.moves))
      errors.push('payload.moves must be an array for PARTIAL_RESCHEDULE');
  }

  return errors;
}

export function validateTemplateInput(body) {
  const errors = [];
  if (!body.name) errors.push('name is required');
  if (!body.periodsPerDay || typeof body.periodsPerDay !== 'number')
    errors.push('periodsPerDay must be a number');
  if (!body.workingDays || typeof body.workingDays !== 'number')
    errors.push('workingDays must be a number');
  if (!Array.isArray(body.classes) || body.classes.length === 0)
    errors.push('classes must be a non-empty array');
  if (!Array.isArray(body.teachers) || body.teachers.length === 0)
    errors.push('teachers must be a non-empty array');
  return errors;
}

/**
 * Express middleware factory.
 */
export function validate(validatorFn) {
  return (req, res, next) => {
    const errors = validatorFn(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }
    next();
  };
}
