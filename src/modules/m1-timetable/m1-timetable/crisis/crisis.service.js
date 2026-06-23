/**
 * Crisis service — business logic & orchestration.
 */

import { nanoid } from 'nanoid';
import { enqueueCrisis } from '#orchestrator/queues/queue.config.js';
import { crisisRepository } from './crisis.repository.js';
import { ApiError } from '#shared/response/ApiError.js';

export const crisisService = {
  /**
   * Trigger a new crisis.
   */
  async triggerCrisis(schoolId, { type, payload, severity, title, description }, user) {
    // Verify timetable exists and is published
    if (payload.timetableId) {
      const timetable = await crisisRepository.findTimetable(payload.timetableId, schoolId);
      if (!timetable) throw new ApiError(404, 'Timetable not found');
      if (timetable.status === 'DRAFT' || timetable.status === 'GENERATING') {
        throw new ApiError(
          400,
          `Cannot handle crisis for timetable in '${timetable.status}' status`
        );
      }
    }

    // Verify teacher exists (TEACHER_ABSENT)
    if (type === 'TEACHER_ABSENT') {
      const teacher = await crisisRepository.findTeacher(payload.teacherId, schoolId);
      if (!teacher) throw new ApiError(404, 'Teacher not found');
      if (teacher.isOnLeave) {
        throw new ApiError(400, 'Teacher is already marked as on leave');
      }
    }

    // Verify room exists (ROOM_UNAVAILABLE)
    if (type === 'ROOM_UNAVAILABLE') {
      const room = await crisisRepository.findRoom(payload.roomId, schoolId);
      if (!room) throw new ApiError(404, 'Room not found');
      if (room.status !== 'AVAILABLE') {
        throw new ApiError(400, `Room is already ${room.status.toLowerCase()}`);
      }
    }

    // Check for duplicate active crisis
    const existingCrisis = await crisisRepository.findActiveCrisis(schoolId, type, payload);
    if (existingCrisis) {
      throw new ApiError(409, 'An active crisis already exists for this resource', {
        existingJobId: existingCrisis.id,
      });
    }

    // Create crisis event
    const crisisEvent = await crisisRepository.createCrisisEvent({
      schoolId,
      timetableId: payload.timetableId,
      type,
      severity: severity || 'MEDIUM',
      title: title || getDefaultTitle(type, payload),
      description: description || '',
      affectedTeacherIds: type === 'TEACHER_ABSENT' ? [payload.teacherId] : [],
      affectedRoomIds: type === 'ROOM_UNAVAILABLE' ? [payload.roomId] : [],
      triggeredBy: user?.id || 'SYSTEM',
      triggerReason: payload.reason || 'Manual trigger',
    });

    // Create job & enqueue
    const jobId = nanoid();
    await crisisRepository.createJobRecord(jobId, 'CRISIS_HANDLING', schoolId);
    await enqueueCrisis({ jobId, schoolId, type, payload, crisisEventId: crisisEvent.id });

    return {
      jobId,
      crisisEventId: crisisEvent.id,
      message: `Crisis '${type}' queued successfully`,
      estimatedResolution: getEstimatedTime(type),
    };
  },

  /**
   * Get job status.
   */
  async getJobStatus(jobId, schoolId) {
    const record = await crisisRepository.getJobRecord(jobId);
    if (!record || record.schoolId !== schoolId) {
      throw new ApiError(404, 'Job not found');
    }

    const response = {
      jobId: record.id,
      status: record.status,
      type: record.type,
      progress: record.progressPercent,
      message: record.statusMessage,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    if (record.status === 'COMPLETED' && record.output) {
      response.result = record.output;
    }
    if (record.status === 'FAILED') {
      response.error = record.error;
    }

    return response;
  },

  /**
   * Get active crises.
   */
  async getActiveCrises(schoolId) {
    return crisisRepository.findActiveCrises(schoolId);
  },

  /**
   * Get crisis details.
   */
  async getCrisisDetails(crisisId, schoolId) {
    const crisis = await crisisRepository.findCrisisById(crisisId, schoolId);
    if (!crisis) throw new ApiError(404, 'Crisis not found');
    return crisis;
  },

  /**
   * Resolve a crisis.
   */
  async resolveCrisis(crisisId, schoolId, { status, resolution }, user) {
    const crisis = await crisisRepository.findCrisisById(crisisId, schoolId);
    if (!crisis) throw new ApiError(404, 'Crisis not found');
    if (crisis.status === 'RESOLVED') {
      throw new ApiError(400, 'Crisis is already resolved');
    }

    return crisisRepository.updateCrisisStatus(crisisId, status, {
      resolvedBy: user?.id,
      resolvedAt: new Date(),
      resolution: resolution || 'Manually resolved',
    });
  },

  /**
   * Get crisis history.
   */
  async getCrisisHistory(schoolId, filters) {
    const { limit, offset, ...rest } = filters;
    const { crises, total } = await crisisRepository.findCrisisHistory(schoolId, {
      ...rest,
      limit,
      offset,
    });

    return {
      data: crises,
      total,
      limit: limit || 20,
      offset: offset || 0,
    };
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultTitle(type, payload) {
  const titles = {
    TEACHER_ABSENT: `Teacher Absent: ${payload.teacherId}`,
    ROOM_UNAVAILABLE: `Room Unavailable: ${payload.roomId}`,
    PARTIAL_RESCHEDULE: `Reschedule: ${payload.moves?.length || 0} slots`,
    MASS_LEAVE: `Mass Leave: ${payload.teacherIds?.length || 0} teachers`,
    WEATHER_EVENT: `Weather Event: ${payload.date}`,
  };
  return titles[type] || `Crisis: ${type}`;
}

function getEstimatedTime(type) {
  const times = {
    TEACHER_ABSENT: '30-60 seconds',
    ROOM_UNAVAILABLE: '20-40 seconds',
    PARTIAL_RESCHEDULE: '10-30 seconds',
    MASS_LEAVE: '60-120 seconds',
    WEATHER_EVENT: '15-30 seconds',
  };
  return times[type] || 'Unknown';
}
