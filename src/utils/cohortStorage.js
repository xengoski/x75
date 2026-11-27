// Local & Session storage manager for Cohort Data (Database preview mode)
import { INITIAL_STUDENTS, INITIAL_HOLIDAYS, INITIAL_ATTENDANCE } from '../data/cohortData';

const KEY_STUDENTS = 'X75_COHORT_STUDENTS_V1';
const KEY_HOLIDAYS = 'X75_COHORT_HOLIDAYS_V1';
const KEY_ATTENDANCE = 'X75_COHORT_ATTENDANCE_V1';
const KEY_ACTIVE_ENROLL = 'X75_ACTIVE_ENROLL_V1';
const KEY_ACTIVE_ROLE = 'X75_ACTIVE_ROLE_V1';

export const loadCohortStudents = () => {
  try {
    const raw = localStorage.getItem(KEY_STUDENTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load cohort students', e);
  }
  return INITIAL_STUDENTS;
};

export const saveCohortStudents = (students) => {
  try {
    localStorage.setItem(KEY_STUDENTS, JSON.stringify(students));
  } catch (e) {
    console.error('Failed to save cohort students', e);
  }
};

export const loadCohortHolidays = () => {
  try {
    const raw = localStorage.getItem(KEY_HOLIDAYS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load cohort holidays', e);
  }
  return INITIAL_HOLIDAYS;
};

export const saveCohortHolidays = (holidays) => {
  try {
    localStorage.setItem(KEY_HOLIDAYS, JSON.stringify(holidays));
  } catch (e) {
    console.error('Failed to save cohort holidays', e);
  }
};

export const loadCohortAttendance = () => {
  try {
    const raw = localStorage.getItem(KEY_ATTENDANCE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load cohort attendance', e);
  }
  return INITIAL_ATTENDANCE;
};

export const saveCohortAttendance = (attendance) => {
  try {
    localStorage.setItem(KEY_ATTENDANCE, JSON.stringify(attendance));
  } catch (e) {
    console.error('Failed to save cohort attendance', e);
  }
};

export const loadActiveEnrollNo = () => {
  try {
    return localStorage.getItem(KEY_ACTIVE_ENROLL) || '260806';
  } catch {
    return '260806';
  }
};

export const saveActiveEnrollNo = (enrollNo) => {
  try {
    localStorage.setItem(KEY_ACTIVE_ENROLL, enrollNo);
  } catch (e) {
    console.error('Failed to save active roll no', e);
  }
};

export const loadActiveRole = () => {
  try {
    const envRole = typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_ROLE;
    if (envRole === 'admin' || envRole === 'student') return envRole;
    return localStorage.getItem(KEY_ACTIVE_ROLE) || 'student';
  } catch {
    return 'student';
  }
};

export const saveActiveRole = (role) => {
  try {
    localStorage.setItem(KEY_ACTIVE_ROLE, role);
  } catch (e) {
    console.error('Failed to save active role', e);
  }
};

export const resetCohortToSeed = () => {
  try {
    localStorage.removeItem(KEY_STUDENTS);
    localStorage.removeItem(KEY_HOLIDAYS);
    localStorage.removeItem(KEY_ATTENDANCE);
  } catch (e) {
    console.error('Failed to reset cohort storage', e);
  }
  return {
    students: INITIAL_STUDENTS,
    holidays: INITIAL_HOLIDAYS,
    attendance: INITIAL_ATTENDANCE
  };
};

// Overlay master calendar holidays over student attendance records
export const getMergedStudentRecords = (studentAttendance = {}, cohortHolidays = {}) => {
  const merged = { ...studentAttendance };
  for (const [dateStr, note] of Object.entries(cohortHolidays)) {
    if (!merged[dateStr]) {
      merged[dateStr] = { status: 'HOLIDAY', note: note || 'College Holiday' };
    }
  }
  return merged;
};
