// =============================================================================
// modules/emergency/emergency.validation.js — RESQID
// =============================================================================
import { z } from 'zod';
import {
  INCIDENT_TYPES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
} from './emergency.constants.js';

export const studentQuerySchema = z.object({
  search: z.string().optional(),
  class: z.string().optional(),
  section: z.string().optional(),
  risk: z.enum(['high', 'low', 'all']).optional().default('all'),
});

export const studentIdParamSchema = z.object({
  studentId: z.string().min(1),
});

export const incidentQuerySchema = z.object({
  studentId: z.string().optional(),
  status: z.enum(INCIDENT_STATUSES).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const createIncidentSchema = z.object({
  studentId: z.string().min(1),
  type: z.enum(INCIDENT_TYPES),
  severity: z.enum(INCIDENT_SEVERITIES),
  description: z.string().min(1),
  actionTaken: z.string().optional(),
  location: z.string().optional(),
  medicationGiven: z.string().optional(),
  ambulanceCalled: z.boolean().optional().default(false),
});

export const statsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // for incidents today, optional
});

export default {
  studentQuery: studentQuerySchema,
  studentIdParam: studentIdParamSchema,
  incidentQuery: incidentQuerySchema,
  createIncident: createIncidentSchema,
  statsQuery: statsQuerySchema,
};