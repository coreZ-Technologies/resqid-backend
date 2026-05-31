// =============================================================================
// modules/students/students.controller.js — RESQID
// Student Controller — HTTP request handlers for student operations
// Used by: Admin, Super Admin, Parent (limited access)
// =============================================================================

import { studentService } from './student.service.js';
import { studentValidation } from './student.validation.js';
import { ApiError } from '#shared/response/ApiError.js';
import { asyncHandler, asyncController } from '#shared/response/asyncHandler.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { paginate } from '#shared/response/paginate.js';
import { logger } from '#shared/utils/logger.js';

// ─── Controller Object ────────────────────────────────────────────────────────

const studentController = {
  // ===========================================================================
  // CREATE OPERATIONS
  // ===========================================================================

  /**
   * POST /api/students
   * Create a single student
   * Access: Admin, Super Admin
   */
  create: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId || req.params.schoolId;

    if (!schoolId) {
      throw ApiError.tenantRequired();
    }

    // Check student limit for plan
    await checkStudentLimit(schoolId);

    const student = await studentService.createStudent(schoolId, req.body);

    // Audit log
    req.auditLog?.('student.create', {
      studentId: student.id,
      schoolId,
    });

    return ApiResponse.created(res, student, 'Student created successfully');
  }),

  /**
   * POST /api/students/bulk
   * Bulk import students
   * Access: Admin, Super Admin
   */
  bulkCreate: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId || req.params.schoolId;

    if (!schoolId) {
      throw ApiError.tenantRequired();
    }

    const { students } = req.body;

    if (!students || !Array.isArray(students)) {
      throw ApiError.badRequest('Students array is required');
    }

    // Check student limit for bulk import
    await checkStudentLimit(schoolId, students.length);

    logger.info(
      `Bulk import initiated by user: ${req.user.id}, school: ${schoolId}, count: ${students.length}`
    );

    const results = await studentService.bulkImportStudents(schoolId, students);

    // Audit log
    req.auditLog?.('student.bulkCreate', {
      schoolId,
      total: results.total,
      imported: results.imported,
      failed: results.failed,
    });

    // If all failed
    if (results.imported === 0) {
      throw ApiError.unprocessable('All records failed validation', results.errors);
    }

    // Partial success
    if (results.failed > 0) {
      return ApiResponse.multiStatus(
        res,
        results,
        `${results.imported} imported, ${results.failed} failed`
      );
    }

    return ApiResponse.created(
      res,
      results,
      `All ${results.imported} students imported successfully`
    );
  }),

  // ===========================================================================
  // READ OPERATIONS
  // ===========================================================================

  /**
   * GET /api/students
   * List students with filtering, search, and pagination
   * Access: Admin, Super Admin
   */
  list: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId || req.query.schoolId;

    if (!schoolId) {
      throw ApiError.tenantRequired();
    }

    const result = await studentService.getStudents(schoolId, req.query);

    return ApiResponse.success(res, result, 'Students retrieved successfully');
  }),

  /**
   * GET /api/students/search
   * Quick search students (for autocomplete)
   * Access: Admin, Super Admin, Teacher
   */
  search: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId || req.query.schoolId;
    const { q } = req.query;

    if (!q || q.length < 2) {
      throw ApiError.badRequest('Search query must be at least 2 characters');
    }

    const students = await studentService.searchStudents(schoolId, q);

    return ApiResponse.success(res, students);
  }),

  /**
   * GET /api/students/stats
   * Get student statistics
   * Access: Admin, Super Admin
   */
  stats: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId || req.query.schoolId;

    if (!schoolId) {
      throw ApiError.tenantRequired();
    }

    const stats = await studentService.getStudentStats(schoolId);

    return ApiResponse.success(res, stats);
  }),

  /**
   * GET /api/students/export
   * Export students data
   * Access: Admin, Super Admin
   */
  export: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId || req.query.schoolId;

    if (!schoolId) {
      throw ApiError.tenantRequired();
    }

    const data = await studentService.exportStudents(schoolId, req.query);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=students-export-${Date.now()}.csv`);

    // Convert to CSV
    const csv = convertToCSV(data);

    return res.send(csv);
  }),

  /**
   * GET /api/students/:studentId
   * Get student by ID
   * Access: Admin, Super Admin, Parent (own children only)
   */
  getById: asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const student = await studentService.getStudentById(studentId, req.user);

    // Audit log for viewing student
    req.auditLog?.('student.view', {
      studentId,
      viewedBy: req.user?.id,
      role: req.user?.role,
    });

    return ApiResponse.success(res, student);
  }),

  /**
   * GET /api/students/qr/:qrCodeId
   * Get student by QR code (public access for emergency)
   * Access: Public (limited data based on visibility)
   */
  getByQrCode: asyncHandler(async (req, res) => {
    const { qrCodeId } = req.params;
    const student = await studentService.getStudentByQrCode(qrCodeId);

    // Audit log for QR scan
    req.auditLog?.('student.qrScan', {
      qrCodeId,
      studentId: student.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.success(res, student);
  }),

  /**
   * GET /api/parents/:parentId/students
   * Get students by parent ID
   * Access: Parent (own children), Admin
   */
  getByParent: asyncHandler(async (req, res) => {
    const { parentId } = req.params;

    // Ensure parent can only see their own students
    if (req.user.role === 'PARENT' && req.user.parentId !== parentId) {
      throw ApiError.forbidden('You can only view your own children');
    }

    const students = await studentService.getStudentsByParent(parentId);

    return ApiResponse.success(res, students);
  }),

  // ===========================================================================
  // UPDATE OPERATIONS
  // ===========================================================================

  /**
   * PUT /api/students/:studentId
   * Update student
   * Access: Admin, Super Admin
   */
  update: asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const student = await studentService.updateStudent(studentId, req.body, req.user);

    // Audit log
    req.auditLog?.('student.update', {
      studentId,
      updatedBy: req.user.id,
      changes: Object.keys(req.body),
    });

    return ApiResponse.success(res, student, 'Student updated successfully');
  }),

  /**
   * PATCH /api/students/:studentId/status
   * Update student status
   * Access: Admin, Super Admin
   */
  updateStatus: asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { status } = req.body;

    if (!status) {
      throw ApiError.badRequest('Status is required');
    }

    const student = await studentService.updateStudentStatus(studentId, status);

    // Audit log
    req.auditLog?.('student.statusUpdate', {
      studentId,
      newStatus: status,
      updatedBy: req.user.id,
    });

    return ApiResponse.success(res, student, `Student status updated to ${status}`);
  }),

  /**
   * PATCH /api/students/:studentId/class
   * Update student class/section (promote/demote)
   * Access: Admin, Super Admin
   */
  updateClass: asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { grade, section } = req.body;

    if (!grade && !section) {
      throw ApiError.badRequest('Grade or section is required');
    }

    const student = await studentService.updateStudent(studentId, { grade, section }, req.user);

    // Audit log
    req.auditLog?.('student.classUpdate', {
      studentId,
      newGrade: grade,
      newSection: section,
      updatedBy: req.user.id,
    });

    return ApiResponse.success(res, student, 'Class updated successfully');
  }),

  /**
   * POST /api/students/bulk/class
   * Bulk assign class/section
   * Access: Admin, Super Admin
   */
  bulkAssignClass: asyncHandler(async (req, res) => {
    const { studentIds, grade, section } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw ApiError.badRequest('Student IDs array is required');
    }

    if (!grade && !section) {
      throw ApiError.badRequest('Grade or section is required');
    }

    const result = await studentService.bulkAssignClass(studentIds, grade, section);

    // Audit log
    req.auditLog?.('student.bulkClassAssign', {
      count: studentIds.length,
      grade,
      section,
      updatedBy: req.user.id,
    });

    return ApiResponse.success(res, result, `${result.count} students updated`);
  }),

  /**
   * PATCH /api/students/bulk/status
   * Bulk update student status
   * Access: Admin, Super Admin
   */
  bulkUpdateStatus: asyncHandler(async (req, res) => {
    const { studentIds, status } = req.body;

    if (!studentIds || !Array.isArray(studentIds)) {
      throw ApiError.badRequest('Student IDs array is required');
    }

    if (!status) {
      throw ApiError.badRequest('Status is required');
    }

    const results = await Promise.allSettled(
      studentIds.map((id) => studentService.updateStudentStatus(id, status))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = results.filter((r) => r.status === 'rejected').length;

    // Audit log
    req.auditLog?.('student.bulkStatusUpdate', {
      total: studentIds.length,
      successCount,
      failedCount,
      status,
      updatedBy: req.user.id,
    });

    return ApiResponse.success(res, {
      total: studentIds.length,
      successCount,
      failedCount,
    });
  }),

  // ===========================================================================
  // PARENT OPERATIONS
  // ===========================================================================

  /**
   * POST /api/students/:studentId/parents
   * Add parent to student
   * Access: Admin, Super Admin
   */
  addParent: asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const result = await studentService.addParentToStudent(studentId, req.body);

    // Audit log
    req.auditLog?.('student.addParent', {
      studentId,
      parentId: result.parentId,
      relationship: result.relationship,
    });

    return ApiResponse.created(res, result, 'Parent added successfully');
  }),

  /**
   * DELETE /api/students/:studentId/parents/:parentId
   * Remove parent from student
   * Access: Admin, Super Admin
   */
  removeParent: asyncHandler(async (req, res) => {
    const { studentId, parentId } = req.params;
    await studentService.removeParentFromStudent(studentId, parentId);

    // Audit log
    req.auditLog?.('student.removeParent', {
      studentId,
      parentId,
    });

    return ApiResponse.success(res, null, 'Parent removed successfully');
  }),

  // ===========================================================================
  // DELETE OPERATIONS
  // ===========================================================================

  /**
   * DELETE /api/students/:studentId
   * Delete student (soft delete by default)
   * Access: Admin, Super Admin
   */
  delete: asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { hardDelete } = req.query;

    await studentService.deleteStudent(studentId, hardDelete === 'true');

    // Audit log
    req.auditLog?.('student.delete', {
      studentId,
      hardDelete: hardDelete === 'true',
      deletedBy: req.user.id,
    });

    return ApiResponse.success(res, null, 'Student deleted successfully');
  }),

  /**
   * POST /api/students/bulk/delete
   * Bulk delete students
   * Access: Admin, Super Admin
   */
  bulkDelete: asyncHandler(async (req, res) => {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds)) {
      throw ApiError.badRequest('Student IDs array is required');
    }

    const results = await Promise.allSettled(
      studentIds.map((id) => studentService.deleteStudent(id))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = results.filter((r) => r.status === 'rejected').length;

    // Audit log
    req.auditLog?.('student.bulkDelete', {
      total: studentIds.length,
      successCount,
      failedCount,
      deletedBy: req.user.id,
    });

    return ApiResponse.success(res, {
      total: studentIds.length,
      successCount,
      failedCount,
    });
  }),

  // ===========================================================================
  // MEDICAL OPERATIONS
  // ===========================================================================

  /**
   * PATCH /api/students/:studentId/medical
   * Update student medical information
   * Access: Admin, Super Admin
   */
  updateMedicalInfo: asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const student = await studentService.updateMedicalInfo(studentId, req.body);

    // Audit log (don't log sensitive medical data)
    req.auditLog?.('student.medicalUpdate', {
      studentId,
      updatedBy: req.user.id,
    });

    return ApiResponse.success(res, student, 'Medical information updated');
  }),

  /**
   * POST /api/students/:studentId/documents
   * Upload student document
   * Access: Admin, Super Admin
   */
  uploadDocument: asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    if (!req.file) {
      throw ApiError.badRequest('Document file is required');
    }

    const document = await studentService.uploadDocument(studentId, req.file, req.body);

    // Audit log
    req.auditLog?.('student.documentUpload', {
      studentId,
      documentId: document.id,
      documentName: document.name,
      uploadedBy: req.user.id,
    });

    return ApiResponse.created(res, document, 'Document uploaded successfully');
  }),

  /**
   * DELETE /api/students/:studentId/documents/:documentId
   * Delete student document
   * Access: Admin, Super Admin
   */
  deleteDocument: asyncHandler(async (req, res) => {
    const { studentId, documentId } = req.params;
    await studentService.deleteDocument(studentId, documentId);

    // Audit log
    req.auditLog?.('student.documentDelete', {
      studentId,
      documentId,
      deletedBy: req.user.id,
    });

    return ApiResponse.success(res, null, 'Document deleted successfully');
  }),
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Check if school has reached student limit based on plan
 */
async function checkStudentLimit(schoolId, additionalCount = 1) {
  // This would check the school's plan and current student count
  // For now, placeholder implementation
  const MAX_STUDENTS = process.env.MAX_STUDENTS_PER_SCHOOL || 5000;

  // const currentCount = await studentService.getStudentCount(schoolId);
  // if (currentCount + additionalCount > planLimit) {
  //   throw ApiError.studentLimitReached(planLimit);
  // }

  return true;
}

/**
 * Convert array of objects to CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Header row
  csvRows.push(headers.join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(value || '').replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
        ? `"${escaped}"`
        : escaped;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// ─── Exports ──────────────────────────────────────────────────────────────────

// Export wrapped controller (all methods wrapped with asyncHandler)
export default asyncController(studentController);

// Export individual handlers if needed
export const {
  create,
  bulkCreate,
  list,
  search,
  stats,
  export: exportStudents,
  getById,
  getByQrCode,
  getByParent,
  update,
  updateStatus,
  updateClass,
  bulkAssignClass,
  bulkUpdateStatus,
  addParent,
  removeParent,
  delete: deleteStudent,
  bulkDelete,
  updateMedicalInfo,
  uploadDocument,
  deleteDocument,
} = studentController;
