import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckSquare, Users, Calendar, Download, SlidersHorizontal,
  ChevronLeft, ChevronRight, Plus, X, Search, 
  Check, Trash2, Copy, CheckCheck, AlertCircle, Eye, EyeOff,
  FileSpreadsheet, FileJson, Lock, Unlock, Database,
  Sun, Moon, Volume2, VolumeX, Smartphone, RefreshCw, KeyRound, Shield
} from 'lucide-react';
import { sfx } from '../../utils/audio';
import { getLocalDateStr } from '../../utils/storage';
import { calculateDayAttendanceStats } from '../../utils/attendanceLogic';
import { ColorSpectrumPicker } from '../common/ColorSpectrumPicker';
import { 
  loadTursoConfig, saveTursoConfig, testTursoConnection 
} from '../../utils/tursoClient';

const ADMIN_PASSWORD = 'pass6789';

export const AdminMobileView = ({
  students = [],
  holidays = {},
  attendance = {},
  onBatchUpdateAttendance,
  onAddHoliday,
  onRemoveHoliday,
  onSelectStudentView,
  accentColor = '#F59E0B',
  onSelectAccent,
  isDark = true,
  setIsDark,
  settings = {},
  onUpdateSettings,
  onCohortSync
}) => {
  // Mobile Admin Tabs: 'mark' | 'students' | 'holidays' | 'export' | 'settings'
  const [activeAdminTab, setActiveAdminTab] = useState('mark');

  // Admin Password Auth State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isPasswordShaking, setIsPasswordShaking] = useState(false);

  // Selected date for attendance (defaults to today)
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr(new Date()));

  // Local selection sets for the active date: set of enrollNos
  const [absentIds, setAbsentIds] = useState(new Set());
  const [odIds, setOdIds] = useState(new Set());

  // Picker Modal State: null | 'absent' | 'od'
  const [pickerMode, setPickerMode] = useState(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Selected student for detail inspection
  const [inspectStudent, setInspectStudent] = useState(null);

  // Student list search
  const [studentSearch, setStudentSearch] = useState('');

  // Add holiday modal
  const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);
  const [holidayDate, setHolidayDate] = useState(() => getLocalDateStr(new Date()));
  const [holidayTitle, setHolidayTitle] = useState('');

  // Export copied states
  const [isJsonCopied, setIsJsonCopied] = useState(false);
  const [isSpreadsheetCopied, setIsSpreadsheetCopied] = useState(false);
  const [saveToast, setSaveToast] = useState('');

  // Turso Cloud Database State
  const [tursoConfig, setTursoConfig] = useState(loadTursoConfig);
  const [tursoStatus, setTursoStatus] = useState('idle'); // 'idle' | 'testing' | 'connected' | 'error' | 'syncing'
  const [tursoStatusMsg, setTursoStatusMsg] = useState('');

  // Date parsing & metadata
  const dateObj = useMemo(() => new Date(selectedDate + 'T00:00:00'), [selectedDate]);
  const isSunday = dateObj.getDay() === 0;
  const isHolidayDeclared = Boolean(holidays[selectedDate]);
  const holidayName = holidays[selectedDate] || (isSunday ? 'Sunday' : null);

  const formattedDateTitle = useMemo(() => {
    const today = getLocalDateStr(new Date());
    const isToday = selectedDate === today;
    const dateFormatted = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    return isToday ? `Today, ${dateFormatted}` : dateFormatted;
  }, [selectedDate, dateObj]);

  // Synchronize initial absent and OD state when selectedDate changes or attendance updates
  useEffect(() => {
    const newAbsent = new Set();
    const newOD = new Set();

    students.forEach(s => {
      const rec = attendance[s.enrollNo]?.[selectedDate];
      if (rec?.status === 'ABSENT') {
        newAbsent.add(s.enrollNo);
      } else if (rec?.status === 'DUTY_LEAVE') {
        newOD.add(s.enrollNo);
      }
    });

    setAbsentIds(newAbsent);
    setOdIds(newOD);
  }, [selectedDate, attendance, students]);

  // Handle Admin Password Verification (pass6789)
  const handleAdminPasswordSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setPasswordError('');
    // Sanitize input
    const clean = (adminPasswordInput || '').trim();
    if (clean === ADMIN_PASSWORD) {
      sfx.confirm();
      setIsAdminUnlocked(true);
      setAdminPasswordInput('');
    } else {
      sfx.absent();
      setIsPasswordShaking(true);
      setPasswordError('Incorrect administrator password');
      setTimeout(() => setIsPasswordShaking(false), 500);
    }
  };

  // Navigate date by offset in days
  const stepDate = (offsetDays) => {
    sfx.tap();
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offsetDays);
    setSelectedDate(getLocalDateStr(d));
  };

  // Student maps for quick lookups
  const studentMap = useMemo(() => {
    const map = new Map();
    students.forEach(s => map.set(s.enrollNo, s));
    return map;
  }, [students]);

  // Calculate attendance statistics across all 60 students
  const studentStats = useMemo(() => {
    return students.map(s => {
      const stuAttendance = attendance[s.enrollNo] || {};
      const merged = { ...stuAttendance };
      Object.entries(holidays).forEach(([d, title]) => {
        if (!merged[d]) merged[d] = { status: 'HOLIDAY', note: title };
      });
      const st = calculateDayAttendanceStats(merged, 75);
      return {
        ...s,
        stats: st
      };
    });
  }, [students, attendance, holidays]);

  // Filtered student list for Students Tab
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return studentStats;
    return studentStats.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.enrollNo.toLowerCase().includes(q)
    );
  }, [studentStats, studentSearch]);

  // Filtered students for Absent/OD Picker
  const pickerStudents = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.enrollNo.toLowerCase().includes(q)
    );
  }, [students, pickerSearch]);

  // Remove student from Absent
  const handleRemoveAbsent = (enrollNo) => {
    sfx.tap();
    setAbsentIds(prev => {
      const next = new Set(prev);
      next.delete(enrollNo);
      return next;
    });
  };

  // Remove student from OD
  const handleRemoveOD = (enrollNo) => {
    sfx.tap();
    setOdIds(prev => {
      const next = new Set(prev);
      next.delete(enrollNo);
      return next;
    });
  };

  // Toggle student in current picker modal
  const handleTogglePickerStudent = (enrollNo) => {
    sfx.tap();
    if (pickerMode === 'absent') {
      setAbsentIds(prev => {
        const next = new Set(prev);
        if (next.has(enrollNo)) {
          next.delete(enrollNo);
        } else {
          next.add(enrollNo);
          setOdIds(odPrev => {
            const odNext = new Set(odPrev);
            odNext.delete(enrollNo);
            return odNext;
          });
        }
        return next;
      });
    } else if (pickerMode === 'od') {
      setOdIds(prev => {
        const next = new Set(prev);
        if (next.has(enrollNo)) {
          next.delete(enrollNo);
        } else {
          next.add(enrollNo);
          setAbsentIds(abPrev => {
            const abNext = new Set(abPrev);
            abNext.delete(enrollNo);
            return abNext;
          });
        }
        return next;
      });
    }
  };

  // 1-Tap Core Action: Mark Everyone Else Present (Pushes to local + Turso)
  const handleMarkRestPresent = () => {
    sfx.confirm();
    const totalCount = students.length;
    const absentCount = absentIds.size;
    const odCount = odIds.size;
    const presentCount = totalCount - absentCount - odCount;

    const updates = {};

    students.forEach(s => {
      if (absentIds.has(s.enrollNo)) {
        updates[s.enrollNo] = {
          dateStr: selectedDate,
          record: { status: 'ABSENT', note: 'Absent' }
        };
      } else if (odIds.has(s.enrollNo)) {
        updates[s.enrollNo] = {
          dateStr: selectedDate,
          record: { status: 'DUTY_LEAVE', note: 'On Duty' }
        };
      } else {
        updates[s.enrollNo] = {
          dateStr: selectedDate,
          record: { status: 'PRESENT', note: '' }
        };
      }
    });

    onBatchUpdateAttendance(updates);

    setSaveToast(`Saved: ${presentCount} Present, ${absentCount} Absent, ${odCount} On Duty`);
    setTimeout(() => setSaveToast(''), 3000);
  };

  // Clear attendance for this date (resets to unrecorded)
  const handleClearDay = () => {
    if (!window.confirm(`Clear all attendance records for ${selectedDate}?`)) return;
    sfx.tap();
    const updates = {};
    students.forEach(s => {
      updates[s.enrollNo] = {
        dateStr: selectedDate,
        record: null
      };
    });
    onBatchUpdateAttendance(updates);
    setAbsentIds(new Set());
    setOdIds(new Set());
    setSaveToast(`Cleared attendance for ${selectedDate}`);
    setTimeout(() => setSaveToast(''), 3000);
  };

  // Collect all distinct recorded academic dates in order
  const allRecordedDates = useMemo(() => {
    const dateSet = new Set();
    Object.keys(holidays).forEach(d => dateSet.add(d));
    Object.values(attendance).forEach(records => {
      if (records) {
        Object.keys(records).forEach(d => dateSet.add(d));
      }
    });
    return Array.from(dateSet).sort();
  }, [holidays, attendance]);

  // Format Date to DD.MM.YY (e.g. 2026-09-03 -> 03.09.26)
  const formatDateToDDMMYY = (isoStr) => {
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0].slice(-2)}`;
    }
    return isoStr;
  };

  // Generate Institutional CSV Spreadsheet (Matches Official College Mechatronics Format)
  const generateSpreadsheetCSV = () => {
    const dateHeaders = allRecordedDates.map(formatDateToDDMMYY);

    const escapeCsv = (str) => {
      const s = String(str ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    // Institutional Banner Rows
    const banner = [
      'DEPARTMENT OF MECHATRONICS',
      'Academic year (2026-2027)',
      'Attendance',
      'Batch:2026-2030                                                                                                                                                                                           Year/Sem/Sec: I / I /A',
      ''
    ];

    // Main Column Headers
    const headers = [
      'Sl. No.',
      'Enroll no.',
      'Name',
      ...dateHeaders,
      'Attended Days',
      'Conducted Days',
      'Attendance %',
      'Status',
      'Days Margin'
    ];

    const rows = [
      ...banner,
      headers.map(escapeCsv).join(',')
    ];

    studentStats.forEach((s, idx) => {
      const stuAttendance = attendance[s.enrollNo] || {};
      const statusText = s.stats.isSafe ? 'Eligible' : 'Deficit';
      const marginText = s.stats.isSafe 
        ? `+${s.stats.safeLeaves} days available` 
        : `-${s.stats.daysNeeded} days needed`;

      const dateStatuses = allRecordedDates.map(dateKey => {
        if (holidays[dateKey]) {
          return holidays[dateKey].toUpperCase();
        }
        const rec = stuAttendance[dateKey];
        if (!rec) {
          const d = new Date(dateKey + 'T00:00:00');
          if (d.getDay() === 0) return 'HOLIDAY';
          return '';
        }
        if (rec.status === 'PRESENT') return 'PRESENT';
        if (rec.status === 'ABSENT') return 'ABSENT';
        if (rec.status === 'DUTY_LEAVE') return 'OD';
        if (rec.status === 'HOLIDAY') return rec.note ? rec.note.toUpperCase() : 'HOLIDAY';
        return '';
      });

      const row = [
        idx + 1,
        s.enrollNo,
        s.name,
        ...dateStatuses,
        s.stats.attendedDays,
        s.stats.conductedDays,
        `${s.stats.percentageFormatted}%`,
        statusText,
        marginText
      ];

      rows.push(row.map(escapeCsv).join(','));
    });

    // UTF-8 BOM ensures perfect rendering in Microsoft Excel & Google Sheets
    return '\uFEFF' + rows.join('\r\n');
  };

  // Generate Institutional TSV (Tab-Separated for Direct Cell Paste into Excel/Sheets)
  const generateSpreadsheetTSV = () => {
    const dateHeaders = allRecordedDates.map(formatDateToDDMMYY);
    const headers = [
      'Sl. No.', 'Enroll no.', 'Name', ...dateHeaders, 'Attended', 'Conducted', 'Attendance %', 'Status', 'Margin'
    ];
    const rows = [
      'DEPARTMENT OF MECHATRONICS',
      'Academic year (2026-2027) - Attendance',
      'Batch: 2026-2030 | Year/Sem/Sec: I / I / A',
      '',
      headers.join('\t')
    ];

    studentStats.forEach((s, idx) => {
      const stuAttendance = attendance[s.enrollNo] || {};
      const statusText = s.stats.isSafe ? 'Eligible' : 'Deficit';
      const marginText = s.stats.isSafe ? `+${s.stats.safeLeaves}d` : `-${s.stats.daysNeeded}d`;

      const dateStatuses = allRecordedDates.map(dateKey => {
        if (holidays[dateKey]) return holidays[dateKey].toUpperCase();
        const rec = stuAttendance[dateKey];
        if (!rec) {
          const d = new Date(dateKey + 'T00:00:00');
          if (d.getDay() === 0) return 'HOLIDAY';
          return '';
        }
        if (rec.status === 'PRESENT') return 'PRESENT';
        if (rec.status === 'ABSENT') return 'ABSENT';
        if (rec.status === 'DUTY_LEAVE') return 'OD';
        if (rec.status === 'HOLIDAY') return rec.note ? rec.note.toUpperCase() : 'HOLIDAY';
        return '';
      });

      const row = [
        idx + 1,
        s.enrollNo,
        s.name,
        ...dateStatuses,
        s.stats.attendedDays,
        s.stats.conductedDays,
        `${s.stats.percentageFormatted}%`,
        statusText,
        marginText
      ];

      rows.push(row.join('\t'));
    });

    return rows.join('\n');
  };

  // Export spreadsheet (.csv) download
  const handleDownloadSpreadsheet = () => {
    sfx.confirm();
    const csvContent = generateSpreadsheetCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_Mechatronics_A_${getLocalDateStr(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Copy spreadsheet as TSV
  const handleCopySpreadsheet = async () => {
    sfx.tap();
    try {
      const tsvContent = generateSpreadsheetTSV();
      await navigator.clipboard.writeText(tsvContent);
      setIsSpreadsheetCopied(true);
      setTimeout(() => setIsSpreadsheetCopied(false), 2200);
    } catch {
      alert('Unable to copy spreadsheet.');
    }
  };

  // Format raw cohort data for JSON export
  const rawCohortJson = useMemo(() => {
    const payload = {
      cohort: 'Mechatronics A (2026-2030)',
      exportedAt: new Date().toISOString(),
      totalStudents: students.length,
      holidays,
      students: studentStats.map(s => ({
        enrollNo: s.enrollNo,
        name: s.name,
        stats: {
          percentage: s.stats.percentage,
          attendedDays: s.stats.attendedDays,
          conductedDays: s.stats.conductedDays,
          daysAvailable: s.stats.safeLeaves,
          daysNeeded: s.stats.daysNeeded,
          isSafe: s.stats.isSafe
        },
        records: attendance[s.enrollNo] || {}
      }))
    };
    return JSON.stringify(payload, null, 2);
  }, [students, studentStats, holidays, attendance]);

  // Export JSON file download
  const handleDownloadJson = () => {
    sfx.confirm();
    const blob = new Blob([rawCohortJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `x75_cohort_attendance_${getLocalDateStr(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Copy JSON to clipboard
  const handleCopyJson = async () => {
    sfx.tap();
    try {
      await navigator.clipboard.writeText(rawCohortJson);
      setIsJsonCopied(true);
      setTimeout(() => setIsJsonCopied(false), 2200);
    } catch {
      alert('Unable to copy to clipboard.');
    }
  };

  // Add holiday handler
  const handleSaveHoliday = (e) => {
    e.preventDefault();
    if (!holidayDate || !holidayTitle.trim()) return;
    sfx.confirm();
    onAddHoliday(holidayDate, holidayTitle.trim());
    setIsAddHolidayOpen(false);
    setHolidayTitle('');
  };

  // Turso DB Handlers
  const handleTestTurso = async () => {
    sfx.tap();
    setTursoStatus('testing');
    setTursoStatusMsg('Testing connection...');
    const res = await testTursoConnection(tursoConfig);
    if (res.success) {
      sfx.confirm();
      setTursoStatus('connected');
      setTursoStatusMsg(`Connected (${res.latencyMs}ms)`);
      saveTursoConfig(tursoConfig);
    } else {
      sfx.absent();
      setTursoStatus('error');
      setTursoStatusMsg(res.error || 'Connection failed');
    }
  };

  useEffect(() => {
    const handleSyncEvent = () => {
      setTursoConfig(loadTursoConfig());
    };
    window.addEventListener('x75-turso-synced', handleSyncEvent);
    return () => window.removeEventListener('x75-turso-synced', handleSyncEvent);
  }, []);

  // Existing records status count for selected day
  const existingRecordsCount = useMemo(() => {
    let recorded = 0;
    students.forEach(s => {
      if (attendance[s.enrollNo]?.[selectedDate]) recorded++;
    });
    return recorded;
  }, [students, attendance, selectedDate]);

  const presentCount = Math.max(0, students.length - absentIds.size - odIds.size);

  // -------------------------------------------------------------
  // ADMIN PASSWORD AUTH SCREEN (pass6789)
  // -------------------------------------------------------------
  if (!isAdminUnlocked) {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 select-none bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
        
        {/* Top Header */}
        <div className="pt-[max(2.75rem,env(safe-area-inset-top,0px))] sm:pt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-display font-extrabold text-base tracking-tight lowercase">
              x<span style={{ color: accentColor }}>75</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Admin
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
            Mechatronics A
          </span>
        </div>

        {/* Center Password Prompter */}
        <div className={`w-full max-w-xs mx-auto flex flex-col items-center justify-center space-y-4 my-auto ${isPasswordShaking ? 'animate-shake' : ''}`}>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-xs">
            <Lock className="w-6 h-6 stroke-[2]" />
          </div>

          <div className="text-center space-y-1">
            <span className="font-bold text-base text-[var(--color-text-primary)] block">
              Admin Access
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              Enter admin password to manage attendance
            </span>
          </div>

          <form onSubmit={handleAdminPasswordSubmit} className="w-full space-y-3 pt-2">
            <div className="relative">
              <input
                type={showAdminPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={adminPasswordInput}
                onChange={(e) => {
                  setAdminPasswordInput(e.target.value);
                  setPasswordError('');
                }}
                autoFocus
                className={`w-full py-3 px-4 pr-10 rounded-xl bg-[var(--color-surface-secondary)] border text-center font-medium text-sm text-[var(--color-text-primary)] outline-none transition-colors ${
                  passwordError ? 'border-red-500 animate-shake' : 'border-[var(--color-border)] focus:border-amber-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowAdminPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] tap-spring"
              >
                {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {passwordError && (
              <span className="text-xs font-semibold text-red-400 block text-center animate-in fade-in">
                {passwordError}
              </span>
            )}

            <button
              type="submit"
              disabled={!adminPasswordInput.trim()}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-amber-500 text-black shadow-md tap-spring disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5"
            >
              <span>Unlock Admin Console</span>
            </button>
          </form>
        </div>

        <div className="text-center text-[10px] text-[var(--color-text-tertiary)] pb-3">
          Authorized personnel only. Password protected.
        </div>

      </div>
    );
  }

  // -------------------------------------------------------------
  // UNLOCKED ADMIN INTERFACE
  // -------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      
      {/* Hyperminimal Header */}
      <div className="pt-[max(2.75rem,env(safe-area-inset-top,0px))] sm:pt-4 pb-2 px-5 select-none flex items-center justify-between shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface-card)]">
        <div className="flex items-center space-x-2">
          <span className="font-display font-extrabold text-base tracking-tight text-[var(--color-text-primary)] lowercase flex items-baseline">
            x<span style={{ color: accentColor }}>75</span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
            Admin
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
            Mechatronics A
          </span>
          <button
            type="button"
            onClick={() => {
              sfx.tap();
              setIsAdminUnlocked(false);
            }}
            className="w-7 h-7 rounded-lg bg-[var(--color-surface-secondary)] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center tap-spring"
            title="Lock Admin Console"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* Transient Save Toast */}
        {saveToast && (
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
            <CheckCheck className="w-4 h-4 shrink-0" />
            <span>{saveToast}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: MARK ATTENDANCE */}
        {/* ------------------------------------------------------------- */}
        {activeAdminTab === 'mark' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            
            {/* Date Navigator Header */}
            <div className="p-3 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => stepDate(-1)}
                className="w-8 h-8 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center tap-spring"
                aria-label="Previous day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                  {formattedDateTitle}
                </span>
                <span className="text-[10px] text-[var(--color-text-tertiary)] font-apple-num">
                  {selectedDate}
                </span>
              </div>

              <button
                type="button"
                onClick={() => stepDate(1)}
                className="w-8 h-8 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center tap-spring"
                aria-label="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekend / Holiday Banner */}
            {(isSunday || isHolidayDeclared) && (
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{holidayName} — Auto Holiday</span>
                </div>
              </div>
            )}

            {/* SECTION: WHO IS ABSENT? */}
            <div className="p-3.5 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-absent)]" />
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">
                    Absent ({absentIds.size})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sfx.tap();
                    setPickerMode('absent');
                    setPickerSearch('');
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 tap-spring flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Absent</span>
                </button>
              </div>

              {absentIds.size === 0 ? (
                <p className="text-xs text-[var(--color-text-tertiary)] py-1 italic">
                  No absentees selected
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Array.from(absentIds).map(enrollNo => {
                    const stu = studentMap.get(enrollNo);
                    return (
                      <span
                        key={enrollNo}
                        className="inline-flex items-center space-x-1 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-medium bg-red-500/15 text-red-300 border border-red-500/30"
                      >
                        <span className="truncate max-w-[150px]">{stu?.name || enrollNo}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAbsent(enrollNo)}
                          className="w-4 h-4 rounded-md hover:bg-red-500/30 flex items-center justify-center text-red-300 tap-spring"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION: WHO IS ON OD? */}
            <div className="p-3.5 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-duty)]" />
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">
                    On Duty ({odIds.size})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sfx.tap();
                    setPickerMode('od');
                    setPickerSearch('');
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 tap-spring flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add OD</span>
                </button>
              </div>

              {odIds.size === 0 ? (
                <p className="text-xs text-[var(--color-text-tertiary)] py-1 italic">
                  No on duty students selected
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Array.from(odIds).map(enrollNo => {
                    const stu = studentMap.get(enrollNo);
                    return (
                      <span
                        key={enrollNo}
                        className="inline-flex items-center space-x-1 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30"
                      >
                        <span className="truncate max-w-[150px]">{stu?.name || enrollNo}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOD(enrollNo)}
                          className="w-4 h-4 rounded-md hover:bg-purple-500/30 flex items-center justify-center text-purple-300 tap-spring"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Attendance Breakdown Summary */}
            <div className="p-3 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Present</span>
                <span className="font-apple-num font-bold text-sm text-[var(--color-present-text)]">
                  {presentCount}
                </span>
              </div>
              <div className="border-x border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Absent</span>
                <span className="font-apple-num font-bold text-sm text-[var(--color-absent-text)]">
                  {absentIds.size}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-secondary)] block">On Duty</span>
                <span className="font-apple-num font-bold text-sm text-[var(--color-duty-text)]">
                  {odIds.size}
                </span>
              </div>
            </div>

            {/* PRIMARY ONE-TAP ACTION BUTTON */}
            <button
              type="button"
              onClick={handleMarkRestPresent}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 text-black font-bold text-sm shadow-md tap-spring flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {existingRecordsCount > 0 
                  ? `Update Attendance (${presentCount} Present)`
                  : `Mark Rest Present (${presentCount} Students)`}
              </span>
            </button>

            {/* Clear Day Option */}
            {existingRecordsCount > 0 && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleClearDay}
                  className="text-[11px] text-[var(--color-text-tertiary)] hover:text-red-400 transition-colors"
                >
                  Clear attendance for this date
                </button>
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: STUDENTS */}
        {/* ------------------------------------------------------------- */}
        {activeAdminTab === 'students' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:border-amber-500/50"
              />
              {studentSearch && (
                <button
                  type="button"
                  onClick={() => setStudentSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Student Count */}
            <div className="flex items-center justify-between px-1 text-[11px] text-[var(--color-text-secondary)] font-medium">
              <span>{filteredStudents.length} Students</span>
              <span>Min Target: 75%</span>
            </div>

            {/* Students List */}
            <div className="space-y-1.5 pb-2">
              {filteredStudents.map(stu => {
                const isSafe = stu.stats.isSafe;
                return (
                  <button
                    key={stu.enrollNo}
                    type="button"
                    onClick={() => {
                      sfx.tap();
                      setInspectStudent(stu);
                    }}
                    className="w-full p-2.5 rounded-xl bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-left flex items-center justify-between tap-spring transition-colors"
                  >
                    <div className="truncate mr-2">
                      <span className="text-xs font-bold text-[var(--color-text-primary)] block truncate">
                        {stu.name}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-tertiary)]">
                        Mechatronics A
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`font-apple-num font-bold text-xs ${
                        isSafe ? 'text-[var(--color-present-text)]' : 'text-[var(--color-absent-text)]'
                      }`}>
                        {stu.stats.percentageFormatted}%
                      </span>
                      <span className={`text-[10px] block font-medium ${
                        isSafe ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-absent-text)]'
                      }`}>
                        {isSafe 
                          ? `+${stu.stats.safeLeaves} days available` 
                          : `-${stu.stats.daysNeeded} days needed`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: HOLIDAYS */}
        {/* ------------------------------------------------------------- */}
        {activeAdminTab === 'holidays' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Sunday Notice */}
            <div className="p-3 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
              All Sundays are automatically treated as holidays across the cohort.
            </div>

            {/* Add Holiday Button */}
            <button
              type="button"
              onClick={() => {
                sfx.tap();
                setIsAddHolidayOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-card)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-primary)] flex items-center justify-center space-x-1.5 tap-spring"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Holiday</span>
            </button>

            {/* List of Declared Holidays */}
            <div className="space-y-1.5 pb-2">
              {Object.entries(holidays)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dateKey, title]) => {
                  const dObj = new Date(dateKey + 'T00:00:00');
                  const fmt = dObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <div
                      key={dateKey}
                      className="p-2.5 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[var(--color-text-primary)] block">
                          {title}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] font-apple-num">
                          {fmt}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete holiday "${title}"?`)) {
                            sfx.tap();
                            onRemoveHoliday(dateKey);
                          }
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-red-500/20 text-[var(--color-text-tertiary)] hover:text-red-400 flex items-center justify-center tap-spring"
                        aria-label="Delete holiday"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: EXPORT (OFFICIAL INSTITUTIONAL SPREADSHEET + JSON) */}
        {/* ------------------------------------------------------------- */}
        {activeAdminTab === 'export' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            
            {/* Quick Cohort Overview Stats */}
            <div className="p-3 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Students</span>
                <span className="font-bold text-sm font-apple-num text-[var(--color-text-primary)]">
                  {students.length}
                </span>
              </div>
              <div className="border-x border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Academic Days</span>
                <span className="font-bold text-sm font-apple-num text-[var(--color-text-primary)]">
                  {allRecordedDates.length}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Holidays</span>
                <span className="font-bold text-sm font-apple-num text-[var(--color-text-primary)]">
                  {Object.keys(holidays).length}
                </span>
              </div>
            </div>

            {/* SPREADSHEET EXPORT (.CSV & TSV) */}
            <div className="p-3.5 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] space-y-2.5">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  Mechatronics Ledger (.csv)
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                1:1 format matching the official college attendance spreadsheet (Batch 2026-2030, Year/Sem/Sec: I/I/A). Formatted with DD.MM.YY dates and universal UTF-8 BOM encoding.
              </p>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadSpreadsheet}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 text-black font-bold text-xs tap-spring flex items-center justify-center space-x-2 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Ledger (.csv)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySpreadsheet}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-card)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] tap-spring flex items-center justify-center space-x-2"
                >
                  {isSpreadsheetCopied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy for Google Sheets (TSV)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RAW COHORT JSON EXPORT */}
            <div className="p-3.5 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] space-y-2.5">
              <div className="flex items-center space-x-2">
                <FileJson className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  Raw Cohort JSON
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Structured JSON with complete attendance history. Ready to paste directly into ChatGPT, Claude, Gemini or custom scripts.
              </p>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 text-black font-bold text-xs tap-spring flex items-center justify-center space-x-2 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Cohort JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="w-full py-2 px-4 rounded-xl bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-card)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] tap-spring flex items-center justify-center space-x-2"
                >
                  {isJsonCopied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy JSON to Clipboard</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: ADMIN SETTINGS & APPEARANCE & DATABASE */}
        {/* ------------------------------------------------------------- */}
        {activeAdminTab === 'settings' && (
          <div className="space-y-4 animate-in fade-in duration-150">

            {/* Appearance (Theme & Accent Color Customizer) */}
            <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  Appearance
                </span>

                {/* Dark / Light Toggle Pill */}
                <div className="flex items-center p-0.5 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => {
                      sfx.tap();
                      if (setIsDark) setIsDark(true);
                    }}
                    className={`p-1 px-2 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                      isDark ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-xs' : 'text-[var(--color-text-tertiary)]'
                    }`}
                  >
                    <Moon className="w-3 h-3" />
                    <span>Dark</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sfx.tap();
                      if (setIsDark) setIsDark(false);
                    }}
                    className={`p-1 px-2 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                      !isDark ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-xs' : 'text-[var(--color-text-tertiary)]'
                    }`}
                  >
                    <Sun className="w-3 h-3" />
                    <span>Light</span>
                  </button>
                </div>
              </div>

              {/* Shared Reusable Color Spectrum Picker (Curated Swatches + Visual Rainbow Slider - Zero Hex) */}
              <ColorSpectrumPicker
                accentColor={accentColor}
                onSelectAccent={onSelectAccent}
                isDark={isDark}
              />
            </div>

            {/* Feedback & Haptics */}
            <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] space-y-3 shadow-xs">
              <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                Feedback & Haptics
              </span>

              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    sfx.tap();
                    if (onUpdateSettings) onUpdateSettings({ ...settings, feedbackMode: 'sound' });
                    sfx.setMode('sound');
                  }}
                  className={`py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-all ${
                    settings.feedbackMode === 'sound'
                      ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-xs font-bold'
                      : 'text-[var(--color-text-tertiary)]'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Sound</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sfx.haptic('medium');
                    if (onUpdateSettings) onUpdateSettings({ ...settings, feedbackMode: 'vibrate' });
                    sfx.setMode('vibrate');
                  }}
                  className={`py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-all ${
                    settings.feedbackMode === 'vibrate'
                      ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-xs font-bold'
                      : 'text-[var(--color-text-tertiary)]'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Vibrate</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sfx.tap();
                    if (onUpdateSettings) onUpdateSettings({ ...settings, feedbackMode: 'off' });
                    sfx.setMode('off');
                  }}
                  className={`py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-all ${
                    settings.feedbackMode === 'off'
                      ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-xs font-bold'
                      : 'text-[var(--color-text-tertiary)]'
                  }`}
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Off</span>
                </button>
              </div>
            </div>

            {/* Admin Password Security */}
            <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                    Admin Security
                  </span>
                  <span className="text-[10px] text-[var(--color-text-secondary)]">
                    Protected with password authentication
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sfx.tap();
                    setIsAdminUnlocked(false);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 tap-spring flex items-center space-x-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>Lock Now</span>
                </button>
              </div>
            </div>

            {/* Cloud Database (Turso Production libSQL) */}
            <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">
                    Turso Production Database
                  </span>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  tursoStatus === 'connected' 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                    : tursoStatus === 'error'
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {tursoStatus === 'connected' ? 'Live Cloud Sync' : tursoStatus === 'error' ? 'Error' : 'Production DB Ready'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
                <span>Cluster: <code className="font-mono text-cyan-400">AWS Tokyo (ap-ne-1)</code></span>
                <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Auto-Sync Active</span>
                </span>
              </div>

              <p className="text-[11px] text-[var(--color-text-tertiary)] leading-relaxed">
                Changes to attendance and calendar holidays automatically save locally and sync to the cloud when leaving or closing the app.
              </p>

              {tursoStatusMsg && (
                <div className={`p-2 rounded-xl text-[11px] font-medium flex items-center space-x-1.5 ${
                  tursoStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400' :
                  tursoStatus === 'error' ? 'bg-red-500/10 text-red-400' :
                  'bg-white/10 text-[var(--color-text-primary)]'
                }`}>
                  <span>{tursoStatusMsg}</span>
                </div>
              )}

              {/* Database Action */}
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTestTurso}
                  disabled={tursoStatus === 'testing'}
                  className="py-1.5 px-3 rounded-xl bg-[var(--color-surface-secondary)] hover:bg-[var(--color-border)] border border-[var(--color-border)] font-semibold text-[var(--color-text-primary)] tap-spring text-xs flex items-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${tursoStatus === 'testing' ? 'animate-spin' : ''}`} />
                  <span>Test Latency</span>
                </button>

                {tursoConfig.lastSyncTime && (
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">
                    Synced: {new Date(tursoConfig.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE BOTTOM NAVIGATION BAR (5 TABS) */}
      {/* ------------------------------------------------------------- */}
      <nav className="pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-2 px-3 bg-[var(--color-surface-card)] border-t border-[var(--color-border)] grid grid-cols-5 gap-1 shrink-0 select-none">
        <button
          type="button"
          onClick={() => {
            sfx.tap();
            setActiveAdminTab('mark');
          }}
          className={`py-1.5 flex flex-col items-center justify-center space-y-1 tap-spring transition-colors ${
            activeAdminTab === 'mark'
              ? 'text-amber-500 font-bold'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span className="text-[9.5px]">Mark</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sfx.tap();
            setActiveAdminTab('students');
          }}
          className={`py-1.5 flex flex-col items-center justify-center space-y-1 tap-spring transition-colors ${
            activeAdminTab === 'students'
              ? 'text-amber-500 font-bold'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[9.5px]">Students</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sfx.tap();
            setActiveAdminTab('holidays');
          }}
          className={`py-1.5 flex flex-col items-center justify-center space-y-1 tap-spring transition-colors ${
            activeAdminTab === 'holidays'
              ? 'text-amber-500 font-bold'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[9.5px]">Holidays</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sfx.tap();
            setActiveAdminTab('export');
          }}
          className={`py-1.5 flex flex-col items-center justify-center space-y-1 tap-spring transition-colors ${
            activeAdminTab === 'export'
              ? 'text-amber-500 font-bold'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
          }`}
        >
          <Download className="w-4 h-4" />
          <span className="text-[9.5px]">Export</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sfx.tap();
            setActiveAdminTab('settings');
          }}
          className={`py-1.5 flex flex-col items-center justify-center space-y-1 tap-spring transition-colors ${
            activeAdminTab === 'settings'
              ? 'text-amber-500 font-bold'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-[9.5px]">Settings</span>
        </button>
      </nav>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ABSENT / OD STUDENT PICKER */}
      {/* ------------------------------------------------------------- */}
      {pickerMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-md max-h-[85vh] bg-[var(--color-surface-card)] rounded-t-3xl sm:rounded-3xl border border-[var(--color-border)] p-4 flex flex-col space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-200">
            
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <div>
                <span className="text-sm font-bold text-[var(--color-text-primary)] block">
                  {pickerMode === 'absent' ? 'Select Absentees' : 'Select On Duty'}
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  {pickerMode === 'absent' ? `${absentIds.size} selected` : `${odIds.size} selected`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sfx.tap();
                  setPickerMode(null);
                }}
                className="w-7 h-7 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center tap-spring"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Filter Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none"
              />
            </div>

            {/* Student Picker List */}
            <div className="flex-1 overflow-y-auto space-y-1 max-h-64 pr-1">
              {pickerStudents.map(stu => {
                const isSelected = pickerMode === 'absent' 
                  ? absentIds.has(stu.enrollNo) 
                  : odIds.has(stu.enrollNo);
                
                return (
                  <button
                    key={stu.enrollNo}
                    type="button"
                    onClick={() => handleTogglePickerStudent(stu.enrollNo)}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between tap-spring transition-colors ${
                      isSelected
                        ? pickerMode === 'absent'
                          ? 'bg-red-500/15 border border-red-500/40 text-red-200'
                          : 'bg-purple-500/15 border border-purple-500/40 text-purple-200'
                        : 'bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-secondary)] border border-transparent text-[var(--color-text-secondary)]'
                    }`}
                  >
                    <span className="text-xs font-semibold block truncate">
                      {stu.name}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Bottom Buttons */}
            <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  sfx.tap();
                  if (pickerMode === 'absent') setAbsentIds(new Set());
                  else setOdIds(new Set());
                }}
                className="text-xs text-[var(--color-text-tertiary)] hover:text-red-400 font-medium"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => {
                  sfx.confirm();
                  setPickerMode(null);
                }}
                className="py-1.5 px-4 rounded-xl text-xs font-bold bg-amber-500 text-black tap-spring"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: STUDENT DETAILS INSPECTOR */}
      {/* ------------------------------------------------------------- */}
      {inspectStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-md bg-[var(--color-surface-card)] rounded-t-3xl sm:rounded-3xl border border-[var(--color-border)] p-4 space-y-3.5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <div>
                <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                  {inspectStudent.name}
                </span>
                <span className="text-[10px] text-[var(--color-text-secondary)]">
                  Mechatronics A
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sfx.tap();
                  setInspectStudent(null);
                }}
                className="w-7 h-7 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center tap-spring"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Stats Telemetry */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-[var(--color-surface-secondary)]">
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Attendance</span>
                <span className={`font-apple-num font-bold text-sm ${
                  inspectStudent.stats.isSafe ? 'text-[var(--color-present-text)]' : 'text-[var(--color-absent-text)]'
                }`}>
                  {inspectStudent.stats.percentageFormatted}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--color-surface-secondary)]">
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Attended</span>
                <span className="font-apple-num font-bold text-sm text-[var(--color-text-primary)]">
                  {inspectStudent.stats.attendedDays} / {inspectStudent.stats.conductedDays}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--color-surface-secondary)]">
                <span className="text-[10px] text-[var(--color-text-secondary)] block">Leave Margin</span>
                <span className={`font-apple-num font-bold text-sm ${
                  inspectStudent.stats.isSafe ? 'text-[var(--color-present-text)]' : 'text-[var(--color-absent-text)]'
                }`}>
                  {inspectStudent.stats.isSafe 
                    ? `+${inspectStudent.stats.safeLeaves}d` 
                    : `-${inspectStudent.stats.daysNeeded}d`}
                </span>
              </div>
            </div>

            {/* View As Student Button */}
            <button
              type="button"
              onClick={() => {
                sfx.confirm();
                onSelectStudentView(inspectStudent.enrollNo);
                setInspectStudent(null);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-[var(--color-text-primary)] text-xs font-semibold tap-spring flex items-center justify-center space-x-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect in Student View</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD HOLIDAY */}
      {/* ------------------------------------------------------------- */}
      {isAddHolidayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveHoliday}
            className="w-full max-w-sm bg-[var(--color-surface-card)] rounded-3xl border border-[var(--color-border)] p-4 space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <span className="text-xs font-bold text-[var(--color-text-primary)]">
                Declare Holiday
              </span>
              <button
                type="button"
                onClick={() => {
                  sfx.tap();
                  setIsAddHolidayOpen(false);
                }}
                className="w-7 h-7 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center tap-spring"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-[var(--color-text-secondary)] block mb-1">
                  Holiday Date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[var(--color-text-secondary)] block mb-1">
                  Holiday Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pongal Festival"
                  value={holidayTitle}
                  onChange={(e) => setHolidayTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  sfx.tap();
                  setIsAddHolidayOpen(false);
                }}
                className="py-1.5 px-3 rounded-xl text-xs text-[var(--color-text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-1.5 px-4 rounded-xl text-xs font-bold bg-amber-500 text-black tap-spring"
              >
                Add Holiday
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
