-- x75 Attendance System - Turso / libSQL Schema

-- 1. Student Roster
CREATE TABLE IF NOT EXISTS students (
    enroll_no TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dept TEXT DEFAULT 'Mechatronics',
    batch TEXT DEFAULT '2026-2030',
    section TEXT DEFAULT 'A',
    pin_hash TEXT NOT NULL DEFAULT '1234'
);

-- 2. Master College Calendar (Global holidays declared by Admin for the whole class)
CREATE TABLE IF NOT EXISTS college_calendar (
    date TEXT PRIMARY KEY, -- ISO 8601 YYYY-MM-DD
    is_holiday INTEGER DEFAULT 0,
    note TEXT DEFAULT ''
);

-- 3. Individual Student Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enroll_no TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'DUTY_LEAVE')),
    note TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(enroll_no, date),
    FOREIGN KEY(enroll_no) REFERENCES students(enroll_no) ON DELETE CASCADE
);

-- Indices for instant query lookup
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(enroll_no);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_calendar_date ON college_calendar(date);
