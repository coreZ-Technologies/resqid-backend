// school-admin/dashboard/dashboard.service.js
import { DashboardRepository } from './dashboard.repository.js';

const repo = new DashboardRepository();

export class DashboardService {
  async getStats(schoolId) {
    const [totalStudents, totalTeachers, parentsLinked] = await Promise.all([
      repo.getTotalStudents(schoolId),
      repo.getTotalTeachers(schoolId),
      repo.getParentsLinked(schoolId),
    ]);
    // Today's attendance percent (overall)
    const classAttendance = await repo.getTodayAttendanceByClass(schoolId);
    let totalPresent = 0, totalStudentsOverall = 0;
    for (const cls of classAttendance) {
      totalPresent += cls.present;
      totalStudentsOverall += cls.total;
    }
    const todayAttendancePercent = totalStudentsOverall ? (totalPresent / totalStudentsOverall) * 100 : 0;
    return {
      totalStudents,
      totalTeachers,
      parentsLinked,
      todayAttendancePercent: Math.round(todayAttendancePercent * 10) / 10,
    };
  }

  async getClassAttendance(schoolId) {
    return repo.getTodayAttendanceByClass(schoolId);
  }

  async getWeeklyTrend(schoolId) {
    return repo.getWeeklyTrend(schoolId);
  }

  async getRecentActivity(schoolId, type, limit) {
    return repo.getRecentActivity(schoolId, type, limit);
  }

  async getLowAttendance(schoolId, limit = 5) {
    return repo.getLowAttendanceStudents(schoolId, 80, limit);
  }

  async getNotifications(schoolId, limit = 5) {
    const notifs = await repo.getNotifications(schoolId, limit);
    return notifs.map(n => ({
      id: n.id,
      type: n.category?.toLowerCase() || 'info',
      message: n.title + (n.body ? `: ${n.body}` : ''),
      time: this._relativeTime(n.createdAt),
      read: n.isRead,
    }));
  }

  async getTimetable(schoolId, className, section) {
    return repo.getTodayTimetable(schoolId, className, section);
  }

  async getSubscription(schoolId) {
    return repo.getSubscriptionPlan(schoolId);
  }

  _relativeTime(date) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }
}