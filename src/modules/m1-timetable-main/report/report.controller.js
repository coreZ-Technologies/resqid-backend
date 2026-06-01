// report/report.controller.js
import * as reportService from './report.service';

export async function teachers(req, res, next) {
  try {
    const data = await reportService.teacherReport(req.params.timetableId, req.schoolId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function classes(req, res, next) {
  try {
    const data = await reportService.classReport(req.params.timetableId, req.schoolId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function rooms(req, res, next) {
  try {
    // schoolConfig passed via query or loaded from template — simplified here
    const data = await reportService.roomUtilisationReport(
      req.params.timetableId,
      req.schoolId,
      req.schoolConfig
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function validation(req, res, next) {
  try {
    const data = await reportService.validationReport(req.params.timetableId, req.schoolId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function improvements(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const data = await reportService.improvementSuggestions(
      req.params.timetableId,
      req.schoolId,
      limit
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
