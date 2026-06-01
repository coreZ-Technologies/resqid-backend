import { nanoid } from 'nanoid';
import { enqueueCrisis } from '../queue';
import timetableRepository from '../timetable.repository';

/**
 * POST /crisis
 * Enqueue a crisis job. Returns jobId immediately — no hanging requests.
 */
export async function triggerCrisis(req, res, next) {
  try {
    const { type, payload } = req.body;
    if (!type || !payload) {
      return res.status(400).json({ success: false, error: 'type and payload required' });
    }

    const jobId = nanoid();
    await timetableRepository.createJobRecord(jobId, 'crisis', req.schoolId);
    await enqueueCrisis({ jobId, schoolId: req.schoolId, type, payload });

    res.status(202).json({ success: true, jobId });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /crisis/job/:jobId — poll job status
 */
export async function getCrisisJobStatus(req, res, next) {
  try {
    const record = await timetableRepository.getJobRecord(req.params.jobId);
    if (!record || record.schoolId !== req.schoolId) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}
