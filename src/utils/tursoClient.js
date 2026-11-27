// Turso / libSQL Cloud Database Client Integration
import { createClient } from '@libsql/client/web';

const KEY_TURSO_CONFIG = 'X75_TURSO_CONFIG_V1';
const KEY_TURSO_PENDING = 'X75_TURSO_PENDING_MUTATIONS_V1';

const DEFAULT_TURSO_URL = 'https://x75-attendance-xengoski.aws-ap-northeast-1.turso.io';
const DEFAULT_TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTU3NTE3NjYsImlkIjoiMDFhMjFiMjQtODQwMS03MGY4LTk5YmMtNDU0MDQ0YzE0NzE3Iiwia2lkIjoiSDdnUjZlV0pUcjJQSUZGVG5BVTV6RE9LMlJTUGRlbDREcnpCQXQzeEtXSSIsInJpZCI6IjFlZTYyMTk0LWNmMjctNDVkOC1hY2M0LTc1ZDFjZWViZTRmYyJ9.w4Q99IGlxxdSuW7RilGleJ_c2D9RAHYFdTC_YC5AkERcSpSEc_7My0fuCZLiqE5ScI49gG4MK4EErSx2nZoxCA';

export const loadTursoConfig = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(KEY_TURSO_CONFIG);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load Turso config', e);
  }
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURSO_DATABASE_URL;
  const envToken = typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURSO_AUTH_TOKEN;
  return {
    url: envUrl || DEFAULT_TURSO_URL,
    authToken: envToken || DEFAULT_TURSO_TOKEN,
    autoSync: true,
    lastSyncTime: null
  };
};

export const saveTursoConfig = (cfg) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(KEY_TURSO_CONFIG, JSON.stringify(cfg));
    }
  } catch (e) {
    console.error('Failed to save Turso config', e);
  }
};

let cachedClient = null;
let cachedUrl = '';
let cachedToken = '';

export const getTursoClient = (customConfig = null) => {
  const cfg = customConfig || loadTursoConfig();
  const url = (cfg.url || '').trim();
  const authToken = (cfg.authToken || '').trim();

  if (!url) return null;

  if (cachedClient && cachedUrl === url && cachedToken === authToken) {
    return cachedClient;
  }

  try {
    let normalizedUrl = url;
    if (normalizedUrl.startsWith('libsql://')) {
      normalizedUrl = normalizedUrl.replace('libsql://', 'https://');
    }

    cachedClient = createClient({
      url: normalizedUrl,
      authToken: authToken || undefined
    });
    cachedUrl = url;
    cachedToken = authToken;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize libSQL client', err);
    return null;
  }
};

// Test connection latency
export const testTursoConnection = async (customConfig = null) => {
  const client = getTursoClient(customConfig);
  if (!client) {
    return { success: false, error: 'Database URL is missing' };
  }

  const start = performance.now();
  try {
    const rs = await client.execute('SELECT 1 as test_val;');
    const latencyMs = Math.round(performance.now() - start);
    return { success: true, latencyMs, rows: rs.rows };
  } catch (err) {
    return { success: false, error: err.message || 'Connection failed' };
  }
};

// Initialize remote tables if they don't exist
export const ensureTursoSchema = async (client) => {
  if (!client) return;

  await client.batch([
    `CREATE TABLE IF NOT EXISTS students (
      enroll_no TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      dept TEXT DEFAULT 'Mechatronics',
      batch TEXT DEFAULT '2026-2030',
      section TEXT DEFAULT 'A'
    );`,
    `CREATE TABLE IF NOT EXISTS college_calendar (
      date TEXT PRIMARY KEY,
      is_holiday INTEGER DEFAULT 0,
      note TEXT DEFAULT ''
    );`,
    `CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enroll_no TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'DUTY_LEAVE')),
      note TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(enroll_no, date)
    );`
  ]);
};

// -------------------------------------------------------------
// PENDING MUTATION QUEUE (Auto-syncs on app close / backgrounding)
// -------------------------------------------------------------

export const getPendingMutations = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(KEY_TURSO_PENDING);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to get pending mutations', e);
  }
  return [];
};

export const savePendingMutations = (mutations) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(KEY_TURSO_PENDING, JSON.stringify(mutations));
    }
  } catch (e) {
    console.error('Failed to save pending mutations', e);
  }
};

let debounceTimer = null;

const scheduleDebouncedFlush = (delayMs = 1500) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    flushPendingMutations().catch(err => {
      console.warn('Debounced Turso sync failed (will retry on exit):', err);
    });
  }, delayMs);
};

export const queueAttendanceBatch = (updates) => {
  const pending = getPendingMutations();
  pending.push({
    type: 'attendance_batch',
    updates,
    timestamp: Date.now()
  });
  savePendingMutations(pending);
  scheduleDebouncedFlush();
};

export const queueAddHoliday = (dateStr, title) => {
  const pending = getPendingMutations();
  pending.push({
    type: 'add_holiday',
    dateStr,
    title,
    timestamp: Date.now()
  });
  savePendingMutations(pending);
  scheduleDebouncedFlush();
};

export const queueRemoveHoliday = (dateStr) => {
  const pending = getPendingMutations();
  pending.push({
    type: 'remove_holiday',
    dateStr,
    timestamp: Date.now()
  });
  savePendingMutations(pending);
  scheduleDebouncedFlush();
};

let isFlushing = false;

// Flush all pending changes directly to Turso DB (called on app close/pause)
export const flushPendingMutations = async () => {
  if (isFlushing) return { success: false, reason: 'Already flushing' };
  
  const pending = getPendingMutations();
  if (!pending || pending.length === 0) {
    return { success: true, count: 0 };
  }

  const client = getTursoClient();
  if (!client) {
    return { success: false, error: 'Turso client not available' };
  }

  isFlushing = true;

  try {
    await ensureTursoSchema(client);

    // Consolidate statements
    const statements = [];
    // Deduplicate attendance updates: key = `${enrollNo}#${dateStr}` -> record
    const attendanceMap = new Map();
    // Deduplicate holidays: key = dateStr -> { isHoliday: bool, title: string }
    const holidayMap = new Map();

    for (const item of pending) {
      if (item.type === 'attendance_batch' && item.updates) {
        Object.entries(item.updates).forEach(([enrollNo, { dateStr, record }]) => {
          attendanceMap.set(`${enrollNo}#${dateStr}`, { enrollNo, dateStr, record });
        });
      } else if (item.type === 'add_holiday') {
        holidayMap.set(item.dateStr, { isHoliday: true, title: item.title || 'Holiday' });
      } else if (item.type === 'remove_holiday') {
        holidayMap.set(item.dateStr, { isHoliday: false });
      }
    }

    // Generate holiday statements
    holidayMap.forEach(({ isHoliday, title }, dateStr) => {
      if (isHoliday) {
        statements.push({
          sql: `INSERT INTO college_calendar (date, is_holiday, note) 
                VALUES (?, 1, ?) 
                ON CONFLICT(date) DO UPDATE SET is_holiday = 1, note = excluded.note;`,
          args: [dateStr, title]
        });
      } else {
        statements.push({
          sql: `DELETE FROM college_calendar WHERE date = ?;`,
          args: [dateStr]
        });
      }
    });

    // Generate attendance statements
    attendanceMap.forEach(({ enrollNo, dateStr, record }) => {
      if (!record || !record.status || record.status === 'HOLIDAY') {
        statements.push({
          sql: `DELETE FROM attendance_records WHERE enroll_no = ? AND date = ?;`,
          args: [enrollNo, dateStr]
        });
      } else {
        statements.push({
          sql: `INSERT INTO attendance_records (enroll_no, date, status, note, updated_at) 
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) 
                ON CONFLICT(enroll_no, date) DO UPDATE SET 
                  status = excluded.status, 
                  note = excluded.note, 
                  updated_at = CURRENT_TIMESTAMP;`,
          args: [enrollNo, dateStr, record.status, record.note || '']
        });
      }
    });

    if (statements.length > 0) {
      const BATCH_SIZE = 100;
      for (let i = 0; i < statements.length; i += BATCH_SIZE) {
        const chunk = statements.slice(i, i + BATCH_SIZE);
        await client.batch(chunk);
      }
    }

    // Successfully applied to remote DB -> clear the queue
    savePendingMutations([]);

    const cfg = loadTursoConfig();
    cfg.lastSyncTime = new Date().toISOString();
    saveTursoConfig(cfg);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('x75-turso-synced', {
        detail: { count: statements.length, time: cfg.lastSyncTime }
      }));
    }

    return { success: true, count: statements.length };
  } catch (err) {
    console.error('Failed to flush mutations to Turso:', err);
    return { success: false, error: err.message };
  } finally {
    isFlushing = false;
  }
};

// Full Push of local cohort ledger to Turso
export const pushCohortToTurso = async (students, holidays, attendance) => {
  const client = getTursoClient();
  if (!client) throw new Error('Turso client is not configured');

  await ensureTursoSchema(client);

  const statements = [];

  // Upsert students
  students.forEach(s => {
    statements.push({
      sql: `INSERT INTO students (enroll_no, name, dept, batch, section) 
            VALUES (?, ?, ?, ?, ?) 
            ON CONFLICT(enroll_no) DO UPDATE SET name = excluded.name;`,
      args: [s.enrollNo, s.name, s.dept || 'Mechatronics', s.batch || '2026-2030', s.section || 'A']
    });
  });

  // Upsert holidays
  Object.entries(holidays).forEach(([d, title]) => {
    statements.push({
      sql: `INSERT INTO college_calendar (date, is_holiday, note) 
            VALUES (?, 1, ?) 
            ON CONFLICT(date) DO UPDATE SET is_holiday = 1, note = excluded.note;`,
      args: [d, title || 'Holiday']
    });
  });

  // Upsert attendance records
  Object.entries(attendance).forEach(([enrollNo, records]) => {
    if (!records) return;
    Object.entries(records).forEach(([dateStr, rec]) => {
      if (!rec || !rec.status || rec.status === 'HOLIDAY') return;
      statements.push({
        sql: `INSERT INTO attendance_records (enroll_no, date, status, note, updated_at) 
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) 
              ON CONFLICT(enroll_no, date) DO UPDATE SET 
                status = excluded.status, 
                note = excluded.note, 
                updated_at = CURRENT_TIMESTAMP;`,
        args: [enrollNo, dateStr, rec.status, rec.note || '']
      });
    });
  });

  const BATCH_SIZE = 100;
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const chunk = statements.slice(i, i + BATCH_SIZE);
    await client.batch(chunk);
  }

  // Clear any pending queue since full dataset is pushed
  savePendingMutations([]);

  const cfg = loadTursoConfig();
  cfg.lastSyncTime = new Date().toISOString();
  saveTursoConfig(cfg);

  return { success: true, count: statements.length };
};

// Pull cohort ledger from Turso
export const pullCohortFromTurso = async () => {
  const client = getTursoClient();
  if (!client) throw new Error('Turso client is not configured');

  await ensureTursoSchema(client);

  const [studentsResult, holidaysResult, attendanceResult] = await Promise.all([
    client.execute('SELECT enroll_no, name, dept, batch, section FROM students ORDER BY enroll_no ASC;'),
    client.execute('SELECT date, note FROM college_calendar WHERE is_holiday = 1 ORDER BY date ASC;'),
    client.execute('SELECT enroll_no, date, status, note FROM attendance_records;')
  ]);

  const students = studentsResult.rows.map(r => ({
    enrollNo: String(r.enroll_no),
    name: String(r.name),
    dept: String(r.dept || 'Mechatronics'),
    batch: String(r.batch || '2026-2030'),
    section: String(r.section || 'A')
  }));

  const holidays = {};
  holidaysResult.rows.forEach(r => {
    holidays[String(r.date)] = String(r.note || 'Holiday');
  });

  const attendance = {};
  attendanceResult.rows.forEach(r => {
    const enrollNo = String(r.enroll_no);
    const dateStr = String(r.date);
    const status = String(r.status);
    const note = String(r.note || '');

    if (!attendance[enrollNo]) attendance[enrollNo] = {};
    attendance[enrollNo][dateStr] = { status, note };
  });

  const cfg = loadTursoConfig();
  cfg.lastSyncTime = new Date().toISOString();
  saveTursoConfig(cfg);

  return { students, holidays, attendance };
};
