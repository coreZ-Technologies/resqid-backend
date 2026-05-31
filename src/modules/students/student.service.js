// =============================================================================
// modules/students/student.service.js — RESQID
// Student Service — Business logic layer for student operations
// =============================================================================

import studentRepository from './student.repository.js';
import { studentValidation } from './student.validation.js';
import { ApiError } from '#shared/response/ApiError.js';
import { logger } from '#config/logger.js';

// ─── Service Class ────────────────────────────────────────────────────────────

class StudentService {
  // ===========================================================================
  // CREATE
  // ===========================================================================

  /**
   * Create a single student
   */
  async createStudent(schoolId, data) {
    // Validate data
    const validatedData = studentValidation.createStudent.parse(data);

    // Check for duplicate phone numbers in parents
    await this.checkDuplicateParents(validatedData.parents);

    // Create student
    const student = await studentRepository.createStudent(schoolId, validatedData);

    // Log activity
    logger.info(`Student created: ${student.id} - ${student.firstName} ${student.lastName}`);

    return student;
  }

  /**
   * Bulk import students
   */
  async bulkImportStudents(schoolId, studentsData) {
    // Validate bulk data
    const validated = studentValidation.bulkImport.parse({ students: studentsData });

    logger.info(`Bulk import started: ${validated.students.length} students`);

    // Process import
    const results = await studentRepository.bulkCreateStudents(schoolId, validated.students);

    logger.info(`Bulk import completed: ${results.imported} imported, ${results.failed} failed`);

    return results;
  }

  // ===========================================================================
  // READ
  // ===========================================================================

  /**
   * Get students list with filters
   */
  async getStudents(schoolId, query = {}) {
    // Validate query
    const validatedQuery = studentValidation.queryStudents.parse(query);

    return studentRepository.findStudents(schoolId, validatedQuery);
  }

  /**
   * Search students (quick search for autocomplete)
   */
  async searchStudents(schoolId, searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
      throw ApiError.badRequest('Search term must be at least 2 characters');
    }

    return studentRepository.searchStudents(schoolId, searchTerm);
  }

  /**
   * Get student by ID with authorization check
   */
  async getStudentById(studentId, user = null) {
    const student = await studentRepository.findStudentById(studentId);

    if (!student) {
      throw ApiError.studentNotFound();
    }

    // Authorization checks
    if (user) {
      this.authorizeStudentAccess(student, user);
    }

    return student;
  }

  /**
   * Get student by QR code (public access for emergency)
   */
  async getStudentByQrCode(qrCodeId) {
    const student = await studentRepository.findStudentByQrCode(qrCodeId);

    if (!student) {
      throw ApiError.qrInvalid();
    }

    // Return only public/emergency data based on visibility
    return this.filterEmergencyData(student);
  }

  /**
   * Get students by parent ID
   */
  async getStudentsByParent(parentId) {
    return studentRepository.findStudentsByParent(parentId);
  }

  /**
   * Get student statistics
   */
  async getStudentStats(schoolId) {
    return studentRepository.getStudentStats(schoolId);
  }

  // ===========================================================================
  // UPDATE
  // ===========================================================================

  /**
   * Update student
   */
  async updateStudent(studentId, data, user = null) {
    // Check if student exists
    const existingStudent = await studentRepository.findStudentById(studentId);
    if (!existingStudent) {
      throw ApiError.studentNotFound();
    }

    // Authorization
    if (user) {
      this.authorizeStudentAccess(existingStudent, user, 'edit');
    }

    // Validate update data
    const validatedData = studentValidation.updateStudent.parse(data);

    // Update student
    const updated = await studentRepository.updateStudent(studentId, validatedData);

    logger.info(`Student updated: ${studentId}`);

    return updated;
  }

  /**
   * Update student status
   */
  async updateStudentStatus(studentId, status) {
    const validStatuses = [
      'ACTIVE',
      'INACTIVE',
      'GRADUATED',
      'TRANSFERRED',
      'SUSPENDED',
      'WITHDRAWN',
    ];

    if (!validStatuses.includes(status)) {
      throw ApiError.validation([
        { field: 'status', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      ]);
    }

    const student = await studentRepository.findStudentById(studentId);
    if (!student) {
      throw ApiError.studentNotFound();
    }

    return studentRepository.updateStudentStatus(studentId, status);
  }

  /**
   * Bulk assign class/section
   */
  async bulkAssignClass(studentIds, grade, section) {
    if (!studentIds || studentIds.length === 0) {
      throw ApiError.badRequest('Student IDs are required');
    }

    return studentRepository.bulkAssignClass(studentIds, grade, section);
  }

  /**
   * Add parent to student
   */
  async addParentToStudent(studentId, parentData) {
    const validated = studentValidation.addParent.parse(parentData);

    const student = await studentRepository.findStudentById(studentId);
    if (!student) {
      throw ApiError.studentNotFound();
    }

    return studentRepository.addParentToStudent(studentId, validated);
  }

  /**
   * Remove parent from student
   */
  async removeParentFromStudent(studentId, parentId) {
    const student = await studentRepository.findStudentById(studentId);
    if (!student) {
      throw ApiError.studentNotFound();
    }

    // Check if it's the last parent
    const parentCount = student.parentLinks?.length || 0;
    if (parentCount <= 1) {
      throw ApiError.badRequest(
        'Cannot remove last parent. Student must have at least one parent.'
      );
    }

    return studentRepository.removeParentFromStudent(studentId, parentId);
  }

  // ===========================================================================
  // MEDICAL
  // ===========================================================================

  /**
   * Update medical information
   */
  async updateMedicalInfo(studentId, medicalData) {
    const student = await studentRepository.findStudentById(studentId);
    if (!student) {
      throw ApiError.studentNotFound();
    }

    const validated = studentValidation.medicalInfo.parse(medicalData);

    return studentRepository.updateMedicalInfo(studentId, validated);
  }

  // ===========================================================================
  // DOCUMENTS
  // ===========================================================================

  /**
   * Upload document
   */
  async uploadDocument(studentId, file, documentData) {
    const student = await studentRepository.findStudentById(studentId);
    if (!student) {
      throw ApiError.studentNotFound();
    }

    const validated = studentValidation.document.parse({
      ...documentData,
      file,
    });

    return studentRepository.uploadDocument(studentId, file, validated);
  }

  /**
   * Delete document
   */
  async deleteDocument(studentId, documentId) {
    const student = await studentRepository.findStudentById(studentId);
    if (!student) {
      throw ApiError.studentNotFound();
    }

    return studentRepository.deleteDocument(studentId, documentId);
  }

  // ===========================================================================
  // DELETE
  // ===========================================================================

  /**
   * Delete student (soft delete by default)
   */
  async deleteStudent(studentId, hardDelete = false) {
    const student = await studentRepository.findStudentById(studentId);
    if (!student) {
      throw ApiError.studentNotFound();
    }

    if (hardDelete) {
      await studentRepository.deleteStudent(studentId);
      logger.info(`Student hard deleted: ${studentId}`);
    } else {
      await studentRepository.softDeleteStudent(studentId);
      logger.info(`Student soft deleted: ${studentId}`);
    }

    return { success: true };
  }

  // ===========================================================================
  // EXPORT
  // ===========================================================================

  /**
   * Export students data
   */
  async exportStudents(schoolId, filters = {}) {
    const students = await studentRepository.exportStudents(schoolId, filters);

    // Format for CSV export
    return students.map((student) => ({
      'Student ID': student.studentId || '',
      'Admission Number': student.admissionNumber || '',
      'First Name': student.firstName,
      'Last Name': student.lastName,
      Gender: student.gender,
      'Date of Birth': student.dateOfBirth
        ? new Date(student.dateOfBirth).toLocaleDateString()
        : '',
      Class: student.grade,
      Section: student.section,
      'Roll Number': student.rollNumber || '',
      'Blood Group': student.emergencyProfile?.bloodGroup || '',
      'Parent Name': student.parentLinks?.[0]?.parent
        ? `${student.parentLinks[0].parent.firstName || ''} ${student.parentLinks[0].parent.lastName || ''}`.trim()
        : '',
      'Parent Phone': student.parentLinks?.[0]?.parent?.phone || '',
      'Parent Email': student.parentLinks?.[0]?.parent?.email || '',
      'Emergency Contact': student.emergencyProfile?.contacts?.[0]?.phone || '',
      Status: student.status,
      'Admission Year': student.admissionYear || '',
      Email: student.email || '',
      Phone: student.phone || '',
      Address: student.address || '',
      City: student.city || '',
      State: student.state || '',
    }));
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Check for duplicate parent phones
   */
  async checkDuplicateParents(parents) {
    if (!parents || parents.length === 0) return;

    const phones = parents.map((p) => p.phone).filter(Boolean);

    const uniquePhones = [...new Set(phones)];

    if (phones.length !== uniquePhones.length) {
      throw ApiError.conflict('Duplicate parent phone numbers found');
    }
  }

  /**
   * Authorize student access based on user role
   */
  authorizeStudentAccess(student, user, action = 'view') {
    // Super admin can access all
    if (user.role === 'SUPER_ADMIN') return true;

    // School admin/teacher can access their school's students
    if (
      (user.role === 'SCHOOL_ADMIN' || user.role === 'TEACHER') &&
      student.schoolId === user.schoolId
    ) {
      return true;
    }

    // Parent can only access their own children
    if (user.role === 'PARENT') {
      const isParent = student.parentLinks?.some(
        (link) => link.parentId === user.parentId || link.parentId === user.id
      );
      if (isParent) return true;
    }

    // If editing, require higher privileges
    if (action === 'edit') {
      throw ApiError.permissionDenied('You do not have permission to edit this student');
    }

    throw ApiError.permissionDenied('You are not authorized to access this student');
  }

  /**
   * Filter emergency data based on visibility settings
   */
  filterEmergencyData(student) {
    const visibility = student.emergencyVisibility || 'PUBLIC';
    const profile = student.emergencyProfile;

    // Base data always visible
    const baseData = {
      id: student.id,
      studentId: student.studentId,
      name: `${student.firstName} ${student.lastName}`,
      grade: student.grade,
      section: student.section,
      photoUrl: student.photoUrl,
    };

    if (visibility === 'HIDDEN' || !profile) {
      return baseData;
    }

    if (visibility === 'MINIMAL') {
      return {
        ...baseData,
        bloodGroup: profile.bloodGroup || null,
        allergies: profile.allergies || [],
        conditions: profile.conditions || [],
        emergencyContacts: (profile.contacts || [])
          .filter((c) => c.isActive)
          .slice(0, 1)
          .map((c) => ({
            name: c.name,
            phone: c.phone,
            relation: c.relation,
            isPrimary: c.isPrimary,
          })),
      };
    }

    // PUBLIC - Return all emergency data
    return {
      ...baseData,
      bloodGroup: profile.bloodGroup,
      allergies: profile.allergies,
      medications: profile.medications,
      conditions: profile.conditions,
      doctorName: profile.doctorName,
      doctorPhone: profile.doctorPhone,
      emergencyInstructions: profile.emergencyInstructions,
      emergencyContacts: (profile.contacts || [])
        .filter((c) => c.isActive)
        .sort((a, b) => a.priority - b.priority)
        .map((c) => ({
          name: c.name,
          phone: c.phone,
          relation: c.relation,
          isPrimary: c.isPrimary,
          priority: c.priority,
        })),
    };
  }

  /**
   * Format student for list display
   */
  formatStudentForList(student) {
    const primaryParent =
      student.parentLinks?.find((link) => link.isPrimary) || student.parentLinks?.[0];

    return {
      id: student.id,
      studentId: student.studentId,
      admissionNumber: student.admissionNumber,
      name: `${student.firstName} ${student.lastName}`,
      grade: student.grade,
      section: student.section,
      rollNumber: student.rollNumber,
      status: student.status,
      photoUrl: student.photoUrl,
      gender: student.gender,
      parentName: primaryParent?.parent
        ? `${primaryParent.parent.firstName || ''} ${primaryParent.parent.lastName || ''}`.trim()
        : 'N/A',
      parentPhone: primaryParent?.parent?.phone || 'N/A',
      parentEmail: primaryParent?.parent?.email || null,
      relationship: primaryParent?.relationship || null,
      enrollmentDate: student.enrollmentDate,
      createdAt: student.createdAt,
    };
  }

  /**
   * Get student count for a school (for limit checking)
   */
  async getStudentCount(schoolId) {
    const stats = await studentRepository.getStudentStats(schoolId);
    return stats.active;
  }
}

// ─── Export Singleton ─────────────────────────────────────────────────────────

export const studentService = new StudentService();
export default studentService;
