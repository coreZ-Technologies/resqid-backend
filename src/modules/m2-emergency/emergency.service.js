// =============================================================================
// modules/emergency/emergency.service.js — RESQID
// =============================================================================
import emergencyRepository from './emergency.repository.js';
import { ApiError } from '#shared/response/ApiError.js';

export class EmergencyService {

  /**
   * Get students with emergency summary for the search panel.
   */
  async getStudents(schoolId, query) {
    const students = await emergencyRepository.findStudents(schoolId, query);
    return students.map(s => ({
      id: s.id,
      studentId: s.studentId || s.admissionNumber,
      name: `${s.firstName} ${s.lastName}`,
      class: `${s.grade}${s.section}`,
      grade: s.grade,
      section: s.section,
      rollNo: s.rollNumber,
      photoUrl: s.photoUrl,
      bloodGroup: s.emergencyProfile?.bloodGroup || 'Unknown',
      hasHighRisk: (s.emergencyProfile?.conditions?.length > 0 || s.emergencyProfile?.allergies?.length > 0),
      conditions: s.emergencyProfile?.conditions || [],
      allergies: s.emergencyProfile?.allergies || [],
    }));
  }

  /**
   * Get full emergency profile for a student.
   */
  async getStudentProfile(schoolId, studentId) {
    const student = await emergencyRepository.getFullEmergencyProfile(studentId, schoolId);
    if (!student) throw ApiError.studentNotFound();

    const profile = student.emergencyProfile || {};
    const lastScan = student.tokens?.[0]?.scanLogs?.[0];

    return {
      id: student.id,
      studentId: student.studentId || student.admissionNumber,
      name: `${student.firstName} ${student.lastName}`,
      class: `${student.grade}${student.section}`,
      grade: student.grade,
      section: student.section,
      rollNo: student.rollNumber,
      dob: student.dateOfBirth?.toISOString().split('T')[0],
      photoUrl: student.photoUrl,
      address: student.address,
      bloodGroup: profile.bloodGroup,
      allergies: profile.allergies || [],
      conditions: profile.conditions || [],
      medications: profile.medications || [],
      doctorName: profile.doctorName,
      doctorPhone: profile.doctorPhone,
      insuranceNo: profile.insurancePolicyNumber,
      notes: profile.emergencyInstructions,
      hasHighRisk: (profile.conditions?.length > 0 || profile.allergies?.length > 0),
      lastScanned: lastScan?.scannedAt?.toISOString() || null,
      parents: student.parentLinks.map(link => ({
        relation: link.relationship,
        name: `${link.parent.firstName || ''} ${link.parent.lastName || ''}`.trim(),
        phone: link.parent.phone,
        alternatePhone: link.parent.alternatePhone,
        isReachable: link.parent.isActive,
        isPrimary: link.isPrimary,
      })),
      emergencyContacts: (profile.contacts || []).map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        relation: c.relation,
        isPrimary: c.isPrimary,
        priority: c.priority,
        isActive: c.isActive,
        callEnabled: c.callEnabled,
        whatsappEnabled: c.whatsappEnabled,
        canPickup: c.canPickup,
        notes: c.notes,
      })),
    };
  }

  /**
   * Get incidents list.
   */
  async getIncidents(schoolId, query) {
    const incidents = await emergencyRepository.getIncidents(schoolId, query);
    return incidents.map(i => ({
      id: i.id,
      studentId: i.studentId,
      studentName: `${i.student.firstName} ${i.student.lastName}`,
      class: `${i.student.grade}${i.student.section}`,
      type: i.type,
      severity: i.severity,
      time: i.occurredAt,
      status: i.status,
      description: i.description,
      actionTaken: i.actionTaken,
    }));
  }

  /**
   * Log a new incident.
   */
  async createIncident(schoolId, data, userId) {
    const incident = await emergencyRepository.createIncident(schoolId, data, userId);
    return {
      id: incident.id,
      studentId: incident.studentId,
      type: incident.type,
      severity: incident.severity,
      description: incident.description,
      status: incident.status,
      time: incident.occurredAt,
    };
  }

  /**
   * Get emergency stats.
   */
  async getStats(schoolId) {
    return emergencyRepository.getStats(schoolId);
  }
}

export default new EmergencyService();