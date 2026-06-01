// =============================================================================
// modules/m1-timetable/solver/scorer.js — RESQID
// Rates solution quality 0-100 across multiple dimensions.
// =============================================================================

/**
 * Score a timetable solution across multiple dimensions.
 * Returns { total, breakdown }
 */
export const scoreSolution = (periods, teachers, config, preferences = {}) => {
  const scores = {
    workloadBalance: scoreWorkloadBalance(periods, teachers),
    subjectDistribution: scoreSubjectDistribution(periods, config),
    consecutivePenalty: scoreConsecutivePenalty(periods, teachers),
    morningCoreBonus: preferences.preferMorningCore ? scoreMorningCore(periods, config) : 25,
    gapPenalty: scoreGapPenalty(periods, teachers),
    teacherPreference: scoreTeacherPreferences(periods, teachers),
  };

  // Weighted total
  const weights = {
    workloadBalance: 25,
    subjectDistribution: 20,
    consecutivePenalty: 15,
    morningCoreBonus: 15,
    gapPenalty: 15,
    teacherPreference: 10,
  };

  const total = Math.round(
    Object.entries(scores).reduce((sum, [key, score]) => sum + score * (weights[key] / 100), 0)
  );

  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown: scores,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// WORKLOAD BALANCE (0-25 points)
// ═══════════════════════════════════════════════════════════════════════════════

function scoreWorkloadBalance(periods, teachers) {
  const loads = {};
  for (const period of periods) {
    loads[period.teacherId] = (loads[period.teacherId] || 0) + 1;
  }

  const values = Object.values(loads);
  if (values.length === 0) return 25;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;

  // Perfect balance = range 0-2
  if (range <= 2) return 25;
  if (range <= 4) return 20;
  if (range <= 6) return 15;
  if (range <= 8) return 10;
  return 5;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBJECT DISTRIBUTION (0-20 points)
// ═══════════════════════════════════════════════════════════════════════════════

function scoreSubjectDistribution(periods, config) {
  const periodsPerDay = config?.periodsPerDay || 8;
  let score = 20;
  let penalties = 0;

  // Group periods by class + day + subject
  const grouped = {};
  for (const period of periods) {
    const key = `${period.classId}_${period.dayOfWeek}_${period.subjectId}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(period.periodNumber);
  }

  // Penalize if same subject appears 3+ times in one day for same class
  for (const [key, periodNums] of Object.entries(grouped)) {
    if (periodNums.length >= 3) {
      penalties += (periodNums.length - 2) * 2;
    }

    // Penalize if same subject in consecutive periods (should be spread out)
    const sorted = periodNums.sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] === 1) {
        penalties += 1;
      }
    }
  }

  return Math.max(0, score - penalties);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSECUTIVE PENALTY (0-15 points)
// ═══════════════════════════════════════════════════════════════════════════════

function scoreConsecutivePenalty(periods, teachers) {
  let score = 15;
  let penalties = 0;

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  // Group by teacher + day
  const teacherDays = {};
  for (const period of periods) {
    const key = `${period.teacherId}_${period.dayOfWeek}`;
    if (!teacherDays[key]) teacherDays[key] = [];
    teacherDays[key].push(period.periodNumber);
  }

  for (const [key, periodNums] of Object.entries(teacherDays)) {
    const teacherId = key.split('_')[0];
    const teacher = teacherMap.get(teacherId);
    const maxConsecutive = teacher?.maxConsecutive || 4;
    const consecutive = getConsecutiveGroups(periodNums);

    for (const group of consecutive) {
      if (group.length > maxConsecutive) {
        penalties += (group.length - maxConsecutive) * 2;
      }

      // Bonus: short consecutive blocks are fine
      if (group.length === 2) {
        penalties -= 1; // Double periods are okay (lab, tests)
      }
    }
  }

  return Math.max(0, score - penalties);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MORNING CORE BONUS (0-15 points)
// ═══════════════════════════════════════════════════════════════════════════════

function scoreMorningCore(periods, config) {
  const periodsPerDay = config?.periodsPerDay || 8;
  const morningSlots = Math.floor(periodsPerDay / 2); // First half = morning
  let score = 0;

  const coreSubjects = ['CORE', 'LAB'];

  for (const period of periods) {
    if (period.periodNumber <= morningSlots && coreSubjects.includes(period.type || 'REGULAR')) {
      score += 0.5;
    }
    // Penalize core subjects in last 2 periods
    if (
      period.periodNumber >= periodsPerDay - 1 &&
      coreSubjects.includes(period.type || 'REGULAR')
    ) {
      score -= 0.5;
    }
  }

  return Math.min(15, Math.max(0, Math.round(score)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAP PENALTY (0-15 points)
// ═══════════════════════════════════════════════════════════════════════════════

function scoreGapPenalty(periods, teachers) {
  let score = 15;
  let penalties = 0;

  const teacherDays = {};
  for (const period of periods) {
    const key = `${period.teacherId}_${period.dayOfWeek}`;
    if (!teacherDays[key]) teacherDays[key] = [];
    teacherDays[key].push(period.periodNumber);
  }

  for (const periodNums of Object.values(teacherDays)) {
    const sorted = periodNums.sort((a, b) => a - b);

    // Count gaps between periods
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1] - 1;
      if (gap >= 2) {
        penalties += gap; // Big gaps are bad
      }
    }
  }

  return Math.max(0, score - Math.floor(penalties / 3));
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER PREFERENCES (0-10 points)
// ═══════════════════════════════════════════════════════════════════════════════

function scoreTeacherPreferences(periods, teachers) {
  let score = 0;
  const maxScore = periods.length; // 1 point per slot if preference met
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  for (const period of periods) {
    const teacher = teacherMap.get(period.teacherId);
    if (!teacher) continue;

    // Morning preference
    if (teacher.preferredSlots === 'MORNING' && period.periodNumber <= 4) {
      score += 1;
    }
    // Afternoon preference
    if (teacher.preferredSlots === 'AFTERNOON' && period.periodNumber > 4) {
      score += 1;
    }
    // No preference = neutral (0.5 points)
    if (!teacher.preferredSlots || teacher.preferredSlots === 'ANY') {
      score += 0.5;
    }
  }

  return Math.min(10, Math.round((score / Math.max(1, maxScore)) * 10));
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Group consecutive period numbers into arrays.
 * [1,2,3,5,6,8] → [[1,2,3], [5,6], [8]]
 */
function getConsecutiveGroups(numbers) {
  if (!numbers.length) return [];
  const sorted = [...numbers].sort((a, b) => a - b);
  const groups = [];
  let current = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === 1) {
      current.push(sorted[i]);
    } else {
      groups.push(current);
      current = [sorted[i]];
    }
  }
  groups.push(current);
  return groups;
}

/**
 * Get count of consecutive periods for a teacher on a specific day.
 */
function getConsecutiveCount(periods, teacherId, dayOfWeek, periodNumber) {
  const dayPeriods = periods
    .filter((p) => p.teacherId === teacherId && p.dayOfWeek === dayOfWeek)
    .map((p) => p.periodNumber)
    .sort((a, b) => a - b);

  let count = 1;

  // Count forward
  for (let i = periodNumber + 1; dayPeriods.includes(i); i++) count++;
  // Count backward
  for (let i = periodNumber - 1; dayPeriods.includes(i); i--) count++;

  return count;
}
