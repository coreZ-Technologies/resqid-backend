// wellness.controller.js
import * as wellnessService from './wellness.service';

export async function upsert(req, res, next) {
  try {
    const record = await wellnessService.upsertWellness(
      req.params.teacherId,
      req.schoolId,
      req.body
    );
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const record = await wellnessService.getWellness(req.params.teacherId, req.schoolId);
    if (!record) return res.json({ success: true, data: null });
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await wellnessService.deleteWellness(req.params.teacherId, req.schoolId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
