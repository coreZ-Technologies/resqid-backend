// modules/students/student.repository.js
import { prisma } from '#config/prisma.js';

const prisma = new PrismaClient();

// ─── Student Select (Common includes) ─────────────────────────────────────────

const studentListSelect = {
  id: true,
  studentId: true,
  firstName: true,
  lastName: true,
  gender: true,
  grade: true,
  section: true,
  rollNumber: true,
  status: true,
  photoUrl: true,
  createdAt: true,
  parentLinks: {
    where: { isPrimary: true },
    select: {
      relationship: true,
      parent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  },
};

const studentDetailSelect = {
  id: true,
  studentId: true,
  admissionNumber: true,
  rollNumber: true,
  qrCodeId: true,
  firstName: true,
  lastName: true,
  gender: true,
  dateOfBirth: true,
  photoUrl: true,
  grade: true,
  section: true,
  admissionYear: true,
  enrollmentDate: true,
  previousSchool: true,
  transferCertificate: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  pincode: true,
  status: true,
  emergencyVisibility: true,
  allergies: true,
  conditions: true,
  medications: true,
  cardVisibility: {
    select: {
      id: true,
      visibility: true,
      showName: true,
      showBloodGroup: true,
      showAllergies: true,
    },
  },
  parentLinks: {
    include: {
      parent: true,
    },
  },
  emergencyProfile: {
    include: {
      contacts: {
        orderBy: { priority: 'asc' },
      },
    },
  },
  medicalInfo: true,
  documents: {
    orderBy: { createdAt: 'desc' },
  },
  feeRecords: {
    orderBy: { academicYear: 'desc' },
  },
  achievements: {
    orderBy: { date: 'desc' },
  },
  createdAt: true,
  updatedAt: true,
};

// ─── Repository Class ─────────────────────────────────────────────────────────

class StudentRepository {
  // ===========================================================================
  // CREATE OPERATIONS
  // ===========================================================================

  /**
   * Create a single student with parents and emergency contacts
   */
  async createStudent(schoolId, data) {
    const { parents, emergencyContacts, cardVisibility, ...studentData } = data;

    return prisma.student.create({
      data: {
        schoolId,
        ...studentData,
        admissionNumber: await this.generateAdmissionNumber(schoolId),
        qrCodeId: await this.generateQrCodeId(),

        // Create parent links
        parentLinks: {
          create: parents.map((parent, index) => ({
            parent: parent.parentId
              ? { connect: { id: parent.parentId } }
              : {
                  create: {
                    firstName: parent.firstName,
                    lastName: parent.lastName,
                    phone: parent.phone,
                    email: parent.email,
                    occupation: parent.occupation,
                  },
                },
            relationship: parent.relationship,
            isPrimary: parent.isPrimary || index === 0,
            priority: index,
          })),
        },

        // Create emergency contacts
        emergencyProfile:
          emergencyContacts?.length > 0
            ? {
                create: {
                  schoolId,
                  contacts: {
                    create: emergencyContacts.map((contact) => ({
                      name: contact.name,
                      phone: contact.phone,
                      relation: contact.relation,
                      isPrimary: contact.isPrimary,
                      priority: contact.priority,
                    })),
                  },
                },
              }
            : undefined,

        // Card visibility
        cardVisibility: cardVisibility
          ? {
              create: { visibility: cardVisibility },
            }
          : undefined,
      },
      include: studentDetailSelect,
    });
  }

  /**
   * Bulk create students
   */
  async bulkCreateStudents(schoolId, studentsData) {
    const results = {
      total: studentsData.length,
      imported: 0,
      failed: 0,
      errors: [],
    };

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < studentsData.length; i += batchSize) {
      const batch = studentsData.slice(i, i + batchSize);

      const promises = batch.map(async (studentData, index) => {
        try {
          await this.createStudent(schoolId, studentData);
          results.imported++;
          return { success: true, index: i + index };
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: i + index + 1,
            error: error.message,
            data: studentData,
          });
          return { success: false, index: i + index, error: error.message };
        }
      });

      await Promise.all(promises);
    }

    return results;
  }

  // ===========================================================================
  // READ OPERATIONS
  // ===========================================================================

  /**
   * Get students with filtering, sorting, and pagination
   */
  async findStudents(schoolId, query = {}) {
    const {
      page = 1,
      limit = 15,
      search,
      class: className,
      section,
      status,
      gender,
      bloodGroup,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      parentPhone,
      admissionYear,
    } = query;

    // Build where clause
    const where = { schoolId };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
        { rollNumber: { contains: search, mode: 'insensitive' } },
        { parentLinks: { some: { parent: { phone: { contains: search } } } } },
      ];
    }

    if (className) where.grade = className;
    if (section) where.section = section;
    if (status) where.status = status;
    if (gender) where.gender = gender;
    if (admissionYear) where.admissionYear = admissionYear;

    if (parentPhone) {
      where.parentLinks = {
        some: {
          parent: { phone: { contains: parentPhone } },
        },
      };
    }

    if (bloodGroup) {
      where.emergencyProfile = { bloodGroup };
    }

    // Count total
    const total = await prisma.student.count({ where });

    // Fetch paginated results
    const students = await prisma.student.findMany({
      where,
      select: studentListSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    return {
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Find student by ID with all details
   */
  async findStudentById(studentId, schoolId = null) {
    const where = { id: studentId };
    if (schoolId) where.schoolId = schoolId;

    return prisma.student.findUnique({
      where,
      include: studentDetailSelect,
    });
  }

  /**
   * Find student by admission number
   */
  async findStudentByAdmissionNumber(admissionNumber) {
    return prisma.student.findUnique({
      where: { admissionNumber },
      include: studentDetailSelect,
    });
  }

  /**
   * Find student by QR code
   */
  async findStudentByQrCode(qrCodeId) {
    return prisma.student.findUnique({
      where: { qrCodeId },
      include: {
        ...studentDetailSelect,
        emergencyProfile: {
          include: {
            contacts: {
              where: { isActive: true },
              orderBy: { priority: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * Get students by parent ID
   */
  async findStudentsByParent(parentId) {
    return prisma.student.findMany({
      where: {
        parentLinks: {
          some: { parentId },
        },
      },
      select: studentListSelect,
    });
  }

  /**
   * Search students (quick search)
   */
  async searchStudents(schoolId, searchTerm) {
    return prisma.student.findMany({
      where: {
        schoolId,
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { studentId: { contains: searchTerm, mode: 'insensitive' } },
          { rollNumber: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        grade: true,
        section: true,
        photoUrl: true,
      },
      take: 10,
    });
  }

  // ===========================================================================
  // UPDATE OPERATIONS
  // ===========================================================================

  /**
   * Update student
   */
  async updateStudent(studentId, data) {
    const { parents, emergencyContacts, ...updateData } = data;

    return prisma.student.update({
      where: { id: studentId },
      data: {
        ...updateData,

        // Update parents if provided
        parentLinks: parents
          ? {
              deleteMany: {},
              create: parents.map((parent, index) => ({
                parent: parent.parentId
                  ? { connect: { id: parent.parentId } }
                  : {
                      create: {
                        firstName: parent.firstName,
                        lastName: parent.lastName,
                        phone: parent.phone,
                        email: parent.email,
                        occupation: parent.occupation,
                      },
                    },
                relationship: parent.relationship,
                isPrimary: parent.isPrimary || index === 0,
                priority: index,
              })),
            }
          : undefined,
      },
      include: studentDetailSelect,
    });
  }

  /**
   * Update student status
   */
  async updateStudentStatus(studentId, status) {
    return prisma.student.update({
      where: { id: studentId },
      data: { status },
    });
  }

  /**
   * Add parent to student
   */
  async addParentToStudent(studentId, parentData) {
    const existingCount = await prisma.studentParent.count({
      where: { studentId },
    });

    return prisma.studentParent.create({
      data: {
        studentId,
        parent: parentData.parentId
          ? { connect: { id: parentData.parentId } }
          : {
              create: {
                firstName: parentData.firstName,
                lastName: parentData.lastName,
                phone: parentData.phone,
                email: parentData.email,
                occupation: parentData.occupation,
              },
            },
        relationship: parentData.relationship,
        isPrimary: parentData.isPrimary,
        priority: existingCount,
      },
      include: {
        parent: true,
      },
    });
  }

  /**
   * Remove parent from student
   */
  async removeParentFromStudent(studentId, parentId) {
    return prisma.studentParent.delete({
      where: {
        studentId_parentId: { studentId, parentId },
      },
    });
  }

  // ===========================================================================
  // DELETE OPERATIONS
  // ===========================================================================

  /**
   * Soft delete student (set as inactive)
   */
  async softDeleteStudent(studentId) {
    return prisma.student.update({
      where: { id: studentId },
      data: {
        status: 'INACTIVE',
        isActive: false,
      },
    });
  }

  /**
   * Hard delete student
   */
  async deleteStudent(studentId) {
    return prisma.student.delete({
      where: { id: studentId },
    });
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get student statistics for dashboard
   */
  async getStudentStats(schoolId) {
    const [total, active, inactive, graduated, byClass, byGender, recentAdmissions] =
      await Promise.all([
        prisma.student.count({ where: { schoolId } }),
        prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),
        prisma.student.count({ where: { schoolId, status: 'INACTIVE' } }),
        prisma.student.count({ where: { schoolId, status: 'GRADUATED' } }),
        prisma.student.groupBy({
          by: ['grade'],
          where: { schoolId, status: 'ACTIVE' },
          _count: true,
          orderBy: { grade: 'asc' },
        }),
        prisma.student.groupBy({
          by: ['gender'],
          where: { schoolId, status: 'ACTIVE' },
          _count: true,
        }),
        prisma.student.count({
          where: {
            schoolId,
            createdAt: {
              gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            },
          },
        }),
      ]);

    return {
      total,
      active,
      inactive,
      graduated,
      byClass: byClass.map((c) => ({ grade: c.grade, count: c._count })),
      byGender: byGender.map((g) => ({ gender: g.gender, count: g._count })),
      recentAdmissions,
    };
  }

  /**
   * Get class-wise student count
   */
  async getClassWiseCount(schoolId) {
    return prisma.student.groupBy({
      by: ['grade', 'section'],
      where: { schoolId, status: 'ACTIVE' },
      _count: true,
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Generate unique admission number
   */
  async generateAdmissionNumber(schoolId) {
    const year = new Date().getFullYear();
    const count = await prisma.student.count({
      where: {
        schoolId,
        admissionYear: year,
      },
    });

    return `ADM${year}${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Generate unique QR code ID
   */
  async generateQrCodeId() {
    const { v4: uuidv4 } = await import('uuid');
    return `RESQID-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  /**
   * Check if student exists
   */
  async studentExists(studentId) {
    const count = await prisma.student.count({
      where: { id: studentId },
    });
    return count > 0;
  }

  /**
   * Bulk assign class/section
   */
  async bulkAssignClass(studentIds, grade, section) {
    return prisma.student.updateMany({
      where: { id: { in: studentIds } },
      data: { grade, section },
    });
  }

  /**
   * Export students data
   */
  async exportStudents(schoolId, filters = {}) {
    const where = { schoolId, ...filters };

    return prisma.student.findMany({
      where,
      include: {
        parentLinks: {
          where: { isPrimary: true },
          include: { parent: true },
        },
        emergencyProfile: {
          select: {
            bloodGroup: true,
            allergies: true,
            conditions: true,
            contacts: {
              where: { isActive: true },
              orderBy: { priority: 'asc' },
              take: 2,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

// ─── Export Singleton ─────────────────────────────────────────────────────────

export const studentRepository = new StudentRepository();
export default studentRepository;
