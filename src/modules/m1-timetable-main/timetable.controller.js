import * as timetableService from './timetable.service';

/**
 * POST /timetable/generate
 * Enqueue a generate job. Returns 202 + jobId immediately.
 */
export async function generate(req, res, next) {
  try {
    const { templateId, opts } = req.body;
    if (!templateId) return res.status(400).json({ success: false, error: 'templateId required' });
    const result = await timetableService.startGenerate(req.schoolId, templateId, opts);
    res.status(202).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /timetable/:id/validate
 * Enqueue a validate job on an existing timetable.
 */
export async function validate(req, res, next) {
  try {
    const result = await timetableService.startValidate(req.schoolId, req.params.id);
    res.status(202).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /timetable/job/:jobId
 * Poll job status.
 */
export async function jobStatus(req, res, next) {
  try {
    const record = await timetableService.getJobStatus(req.params.jobId, null, req.schoolId);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /timetable/job/:jobId/stream
 * SSE stream — no polling needed on client, events pushed on status change.
 */
export function streamJob(req, res, next) {
  try {
    timetableService.streamJobProgress(req.params.jobId, req.schoolId, res);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /timetable
 */
export async function list(req, res, next) {
  try {
    const data = await timetableService.listTimetables(req.schoolId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /timetable/:id
 */
export async function getOne(req, res, next) {
  try {
    const data = await timetableService.getTimetable(req.params.id, req.schoolId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /timetable/:id
 */
export async function remove(req, res, next) {
  try {
    await timetableService.deleteTimetable(req.params.id, req.schoolId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
