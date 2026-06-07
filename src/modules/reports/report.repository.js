// src/modules/reports/report.repository.js
import { prisma } from '#config/prisma.js';

function resolveDateRange(dateRange, fromDate, toDate) {
  const now = new Date();
  let start, end;

  switch (dateRange) {
    case 'Today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      break;
    }
    case 'ThisWeek': {
      const day = now.getDay() || 7; // Sunday = 7
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day - 1));
      start.setHours(0, 0, 0, 0);
      end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case 'ThisMonth': {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    }
    case 'LastMonth': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case 'Custom': {
      if (fromDate) start = new Date(`${fromDate}T00:00:00.000Z`);
      if (toDate) end = new Date(`${toDate}T23:59:59.999Z`);
      break;
    }
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  return { start, end };
}

function resolvePreviousPeriod(dateRange, start, end) {
  if (!start || !end) return { start: null, end: null };

  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime());
  const prevStart = new Date(prevEnd.getTime() - duration);

  return { start: prevStart, end: prevEnd };
}

export const reportRepository = {
  // ─── Stats ──────────────────────────────────────────────────────────────

  async getStats(schoolId, date) {
    const dateStr = date || new Date().toISOString().split('T')[0];
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

    const prevStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
    const prevEnd = new Date(dayEnd.getTime() - 24 * 60 * 60 * 1000);

    const [totalStudents, todayRecords, prevDayRecords] = await Promise.all([
      prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),
      prisma.studentAttendanceRecord.findMany({
        where: {
          schoolId,
          markedAt: { gte: dayStart, lte: dayEnd },
        },
        select: { status: true, studentId: true },
      }),
      prisma.studentAttendanceRecord.findMany({
        where: {
          schoolId,
          markedAt: { gte: prevStart, lte: prevEnd },
        },
        select: { status: true, studentId: true },
      }),
    ]);

    // Deduplicate by student (latest record per student)
    const todayMap = new Map();
    for (const r of todayRecords) {
      if (!todayMap.has(r.studentId) || r.status === 'PRESENT') {
        todayMap.set(r.studentId, r.status);
      }
    }

    const prevMap = new Map();
    for (const r of prevDayRecords) {
      if (!prevMap.has(r.studentId) || r.status === 'PRESENT') {
        prevMap.set(r.studentId, r.status);
      }
    }

    const presentToday = [...todayMap.values()].filter((s) => s === 'PRESENT').length;
    const absentToday = [...todayMap.values()].filter((s) => s === 'ABSENT').length;
    const attendanceRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;

    // Previous period rate
    const prevPresent = [...prevMap.values()].filter((s) => s === 'PRESENT').length;
    const prevRate = totalStudents > 0 ? Math.round((prevPresent / totalStudents) * 100) : 0;
    const rateChange = attendanceRate - prevRate;

    return {
      totalStudents,
      presentToday,
      absentToday,
      attendanceRate,
      rateChange,
    };
  },

  // ─── Attendance Report ──────────────────────────────────────────────────

  async getAttendanceReport(schoolId, filters = {}) {
    const {
      dateRange,
      fromDate,
      toDate,
      class: classFilter,
      search,
      limit = 100,
      offset = 0,
    } = filters;
    const { start, end } = resolveDateRange(dateRange, fromDate, toDate);

    // Build class filter: "Cls 5" → grade "5"
    let gradeFilter = null;
    if (classFilter && classFilter !== 'All Classes') {
      const match = classFilter.match(/Cls\s*(\d+)/i);
      if (match) gradeFilter = match[1];
    }

    const studentsWhere = {
      schoolId,
      status: 'ACTIVE',
      ...(gradeFilter && { grade: gradeFilter }),
    };

    if (search) {
      studentsWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get all students matching filters
    const students = await prisma.student.findMany({
      where: studentsWhere,
      select: { id: true, grade: true, section: true },
    });

    // Group by class (grade-section)
    const classGroups = {};
    for (const s of students) {
      const key = `${s.grade}-${s.section}`;
      if (!classGroups[key]) {
        classGroups[key] = { grade: s.grade, section: s.section, studentIds: [] };
      }
      classGroups[key].studentIds.push(s.id);
    }

    // Get attendance records for these students in date range
    const allStudentIds = students.map((s) => s.id);
    const records = await prisma.studentAttendanceRecord.findMany({
      where: {
        schoolId,
        studentId: { in: allStudentIds },
        markedAt: { gte: start, lte: end },
      },
      select: { studentId: true, status: true },
    });

    // Build report per class
    const reportRecords = Object.values(classGroups).map((group) => {
      const classRecords = records.filter((r) => group.studentIds.includes(r.studentId));

      // Deduplicate: latest record per student
      const studentStatus = new Map();
      for (const r of classRecords) {
        studentStatus.set(r.studentId, r.status);
      }

      const totalStudents = group.studentIds.length;
      const present = [...studentStatus.values()].filter((s) => s === 'PRESENT').length;
      const absent = [...studentStatus.values()].filter((s) => s === 'ABSENT').length;
      const late = [...studentStatus.values()].filter((s) => s === 'LATE').length;
      const attendanceRate = totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0;

      return {
        id: `r-${group.grade}-${group.section}`,
        date: start.toISOString().split('T')[0],
        class: `Cls ${group.grade}`,
        section: group.section,
        totalStudents,
        present,
        absent,
        late,
        attendanceRate,
      };
    });

    // Sort by grade numerically, then section
    reportRecords.sort((a, b) => {
      const gradeA = parseInt(a.class.replace('Cls ', ''));
      const gradeB = parseInt(b.class.replace('Cls ', ''));
      if (gradeA !== gradeB) return gradeA - gradeB;
      return a.section.localeCompare(b.section);
    });

    const total = reportRecords.length;
    const paginated = reportRecords.slice(offset, offset + limit);

    return { records: paginated, total, limit, offset };
  },

  // ─── Scan Logs Report ───────────────────────────────────────────────────

  async getScanLogsReport(schoolId, filters = {}) {
    const {
      dateRange,
      fromDate,
      toDate,
      class: classFilter,
      search,
      limit = 100,
      offset = 0,
    } = filters;
    const { start, end } = resolveDateRange(dateRange, fromDate, toDate);

    const where = {
      schoolId,
      scannedAt: { gte: start, lte: end },
    };

    // Search by student name or class
    if (search) {
      where.OR = [
        { studentName: { contains: search, mode: 'insensitive' } },
        { studentClass: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (classFilter && classFilter !== 'All Classes') {
      where.studentClass = { contains: classFilter, mode: 'insensitive' };
    }

    const [logs, total] = await Promise.all([
      prisma.scanLog.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { scannedAt: 'desc' },
        select: {
          id: true,
          scannedAt: true,
          studentName: true,
          studentClass: true,
          studentSection: true,
          result: true,
          device: true,
          deviceModel: true,
          responseTimeMs: true,
        },
      }),
      prisma.scanLog.count({ where }),
    ]);

    const records = logs.map((log) => ({
      id: log.id,
      date: formatDate(log.scannedAt),
      time: formatTime(log.scannedAt),
      studentName: log.studentName || 'Unknown',
      class: log.studentClass ? `Cls ${log.studentClass}` : '—',
      result: log.result || 'SUCCESS',
      device: log.device || log.deviceModel || 'Unknown',
      responseTimeMs: log.responseTimeMs || 0,
    }));

    return { records, total, limit, offset };
  },

  // ─── Filter Options ─────────────────────────────────────────────────────

  async getFilterOptions(schoolId) {
    const students = await prisma.student.findMany({
      where: { schoolId, status: 'ACTIVE' },
      select: { grade: true, section: true },
      distinct: ['grade', 'section'],
    });

    const grades = [...new Set(students.map((s) => s.grade))]
      .filter(Boolean)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((g) => `Cls ${g}`);

    const sections = [...new Set(students.map((s) => s.section))].filter(Boolean).sort();

    return {
      classes: grades,
      sections,
    };
  },

  // ─── Export ─────────────────────────────────────────────────────────────

  async getExportData(schoolId, filters) {
    const { type, dateRange, fromDate, toDate, class: classFilter, search } = filters;

    switch (type) {
      case 'attendance': {
        const result = await this.getAttendanceReport(schoolId, {
          dateRange,
          fromDate,
          toDate,
          class: classFilter,
          search,
          limit: 9999,
          offset: 0,
        });
        return result.records;
      }
      case 'scan_logs': {
        const result = await this.getScanLogsReport(schoolId, {
          dateRange,
          fromDate,
          toDate,
          class: classFilter,
          search,
          limit: 9999,
          offset: 0,
        });
        return result.records;
      }
      case 'students':
      case 'sessions':
        return [];
      default:
        return [];
    }
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}
