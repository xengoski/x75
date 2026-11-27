import React, { useState, useEffect, useRef, useMemo } from 'react';
import { App as CapApp } from '@capacitor/app';
import { StatusView } from './components/StatusView';
import { CalendarView } from './components/CalendarView';
import { ConfigView } from './components/ConfigView';
import { AdminMobileView } from './components/admin/AdminMobileView';
import { StudentInitialSetup } from './components/StudentInitialSetup';
import { UpdateModal } from './components/common/UpdateModal';
import { checkForGitHubUpdates, dismissUpdateNotification } from './utils/updateChecker';
import { BottomNav } from './components/BottomNav';

import { 
  loadStoredState, saveStoredState, exportDataAsJSON, getLocalDateStr 
} from './utils/storage';
import { 
  loadCohortStudents, saveCohortStudents,
  loadCohortHolidays, saveCohortHolidays,
  loadCohortAttendance, saveCohortAttendance,
  loadActiveEnrollNo, saveActiveEnrollNo,
  loadActiveRole, saveActiveRole,
  resetCohortToSeed, getMergedStudentRecords
} from './utils/cohortStorage';
import { applyThemeToDocument } from './utils/theme';
import { calculateDayAttendanceStats } from './utils/attendanceLogic';
import { sfx } from './utils/audio';
import { 
  Shield, User, RotateCcw, Check, X, ChevronLeft
} from 'lucide-react';
import { 
  flushPendingMutations, pullCohortFromTurso, pushCohortToTurso, 
  queueAttendanceBatch, queueAddHoliday, queueRemoveHoliday 
} from './utils/tursoClient';

export default function App() {
  // App Role: 'student' (view-only baseline) | 'admin' (cohort console)
  const [role, setRole] = useState(loadActiveRole);
  const [activeTab, setActiveTab] = useState('status'); // 'status', 'calendar', 'config'

  // Cohort Data State
  const [cohortStudents, setCohortStudents] = useState(loadCohortStudents);
  const [cohortHolidays, setCohortHolidays] = useState(loadCohortHolidays);
  const [cohortAttendance, setCohortAttendance] = useState(loadCohortAttendance);
  const [activeEnrollNo, setActiveEnrollNo] = useState(loadActiveEnrollNo);

  // Student Switcher Modal State (for switching after setup)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // 1-Time Student Setup State
  const [isStudentSetupDone, setIsStudentSetupDone] = useState(() => {
    return localStorage.getItem('X75_STUDENT_SETUP_DONE') === 'true';
  });

  // GitHub 1-Time Update Notification State
  const [updateInfo, setUpdateInfo] = useState(null);

  // Local settings (theme, sound, threshold)
  const [appState, setAppState] = useState(loadStoredState);
  const fileInputRef = useRef(null);

  const { settings } = appState;
  const accentColor = settings.accentColor || '#007AFF';
  const isDark = settings.isDarkMode !== false;
  const feedbackMode = settings.feedbackMode || 'sound';

  // Apply theme & feedback
  useEffect(() => {
    applyThemeToDocument(accentColor, isDark);
    sfx.setMode(feedbackMode);
  }, [accentColor, isDark, feedbackMode]);

  useEffect(() => {
    saveStoredState(appState);
  }, [appState]);

  useEffect(() => {
    saveActiveRole(role);
  }, [role]);

  useEffect(() => {
    saveActiveEnrollNo(activeEnrollNo);
  }, [activeEnrollNo]);

  // Check GitHub for updates on launch
  useEffect(() => {
    checkForGitHubUpdates().then(info => {
      if (info && info.hasUpdate) {
        setUpdateInfo(info);
      }
    });
  }, []);

  // Active student object
  const currentStudent = useMemo(() => {
    return cohortStudents.find(s => s.enrollNo === activeEnrollNo) || cohortStudents[0] || {
      enrollNo: '260806',
      name: 'HARIHARAN M',
      dept: 'Mechatronics',
      batch: '2026-2030',
      section: 'A'
    };
  }, [cohortStudents, activeEnrollNo]);

  // Merged student records: raw personal attendance + master calendar holidays
  const currentStudentRawRecords = useMemo(() => {
    return cohortAttendance[currentStudent.enrollNo] || {};
  }, [cohortAttendance, currentStudent.enrollNo]);

  const currentStudentMergedRecords = useMemo(() => {
    return getMergedStudentRecords(currentStudentRawRecords, cohortHolidays);
  }, [currentStudentRawRecords, cohortHolidays]);

  // Day stats for active student
  const stats = useMemo(() => {
    return calculateDayAttendanceStats(currentStudentMergedRecords, settings.minThreshold || 75);
  }, [currentStudentMergedRecords, settings.minThreshold]);

  // Today string & record
  const todayStr = getLocalDateStr(new Date());
  const todayRecord = currentStudentMergedRecords[todayStr];

  // Native Android Hardware Back Button Handling via Capacitor
  useEffect(() => {
    let backHandle = null;
    const setupBack = async () => {
      try {
        backHandle = await CapApp.addListener('backButton', () => {
          if (isStudentModalOpen) {
            setIsStudentModalOpen(false);
          } else if (role === 'admin') {
            sfx.tap();
            setRole('student');
          } else if (activeTab !== 'status') {
            sfx.tap();
            setActiveTab('status');
          } else {
            CapApp.exitApp();
          }
        });
      } catch {
        // Desktop browser fallback
      }
    };
    setupBack();
    return () => {
      if (backHandle && backHandle.remove) backHandle.remove();
    };
  }, [activeTab, role, isStudentModalOpen]);

  // Turso Auto-Sync: Flush changes on app close/pause/background & Pull on initial launch
  useEffect(() => {
    // 1. Initial launch: Flush any leftover mutations from previous run, then pull latest remote records
    flushPendingMutations()
      .then(() => pullCohortFromTurso())
      .then(remote => {
        if (remote && remote.students && remote.students.length > 0) {
          setCohortStudents(remote.students);
          saveCohortStudents(remote.students);
          setCohortHolidays(remote.holidays);
          saveCohortHolidays(remote.holidays);
          setCohortAttendance(remote.attendance);
          saveCohortAttendance(remote.attendance);
        }
      })
      .catch(err => {
        console.log('Background cloud pull skipped / offline:', err?.message || err);
      });

    // 2. Lifecycle triggers for flushing changes to Turso on app exit/background
    const handleExitFlush = () => {
      flushPendingMutations().catch(err => {
        console.warn('Exit flush error:', err);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleExitFlush();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleExitFlush);
    window.addEventListener('beforeunload', handleExitFlush);

    // Capacitor native Android app lifecycle listeners
    let stateHandle = null;
    let pauseHandle = null;
    const setupCapLifecycle = async () => {
      try {
        stateHandle = await CapApp.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) handleExitFlush();
        });
        pauseHandle = await CapApp.addListener('pause', () => {
          handleExitFlush();
        });
      } catch {
        // Desktop browser fallback
      }
    };
    setupCapLifecycle();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleExitFlush);
      window.removeEventListener('beforeunload', handleExitFlush);
      if (stateHandle && stateHandle.remove) stateHandle.remove();
      if (pauseHandle && pauseHandle.remove) pauseHandle.remove();
    };
  }, []);

  // Admin Callbacks: Batch update across students/dates
  const handleAdminBatchUpdate = (updates) => {
    setCohortAttendance(prev => {
      const next = { ...prev };
      Object.entries(updates).forEach(([enrollNo, { dateStr, record }]) => {
        const stuRecs = { ...(next[enrollNo] || {}) };
        if (!record) delete stuRecs[dateStr];
        else stuRecs[dateStr] = record;
        next[enrollNo] = stuRecs;
      });
      saveCohortAttendance(next);
      return next;
    });
    // Queue mutation to automatically sync to Turso DB
    queueAttendanceBatch(updates);
  };

  // Admin Callbacks: Add global college holiday
  const handleAdminAddHoliday = (dateStr, title) => {
    setCohortHolidays(prev => {
      const next = { ...prev, [dateStr]: title };
      saveCohortHolidays(next);
      return next;
    });
    // Queue mutation to automatically sync to Turso DB
    queueAddHoliday(dateStr, title);
  };

  // Admin Callbacks: Remove global college holiday
  const handleAdminRemoveHoliday = (dateStr) => {
    setCohortHolidays(prev => {
      const next = { ...prev };
      delete next[dateStr];
      saveCohortHolidays(next);
      return next;
    });
    // Queue mutation to automatically sync to Turso DB
    queueRemoveHoliday(dateStr);
  };

  // Admin Callbacks: Reset cohort dataset to initial seed
  const handleResetCohortSeed = () => {
    const fresh = resetCohortToSeed();
    setCohortStudents(fresh.students);
    setCohortHolidays(fresh.holidays);
    setCohortAttendance(fresh.attendance);
    // Push full refreshed seed to Turso cloud
    pushCohortToTurso(fresh.students, fresh.holidays, fresh.attendance).catch(console.error);
  };

  // Settings callbacks
  const handleSelectAccent = (color) => {
    setAppState(prev => ({
      ...prev,
      settings: { ...prev.settings, accentColor: color }
    }));
  };

  const handleToggleDarkMode = (isDarkVal) => {
    setAppState(prev => ({
      ...prev,
      settings: { ...prev.settings, isDarkMode: isDarkVal }
    }));
  };

  const handleUpdateSettings = (newSettings) => {
    setAppState(prev => ({
      ...prev,
      settings: newSettings
    }));
  };

  // Filtered students for Switch Student Modal
  const filteredStudents = useMemo(() => {
    return cohortStudents.filter(s => 
      s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      s.enrollNo.includes(studentSearchQuery)
    );
  }, [cohortStudents, studentSearchQuery]);

  return (
    <div className="w-full h-[100dvh] sm:w-screen sm:h-screen bg-[var(--color-bg-base)] sm:bg-[#070709] flex flex-col items-center justify-between p-0 sm:p-3 select-none overflow-hidden text-[var(--color-text-primary)]">
      
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        className="hidden"
      />

      {/* TOP TESTING TOOLBAR (Visible on Desktop / Web Window for QA) */}
      <header className="w-full max-w-4xl px-4 py-2 hidden sm:flex items-center justify-between bg-[#121316]/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg text-xs z-30 shrink-0 mb-2">
        {/* Left: Brand & Role Toggle Switcher */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-display font-extrabold text-sm tracking-tight text-white">
            <span>x<span style={{ color: accentColor || '#007AFF' }}>75</span></span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
              Dev GUI Preview
            </span>
          </div>

          <div className="h-3.5 w-[1px] bg-white/20" />

          {/* Role Toggle Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-black/40 border border-white/10">
            <button
              type="button"
              onClick={() => {
                sfx.tap();
                setRole('student');
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1.5 transition-all ${
                role === 'student'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Student App</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sfx.tap();
                setRole('admin');
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1.5 transition-all ${
                role === 'admin'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Console</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Student Selector & Debug Buttons */}
        <div className="flex items-center space-x-2.5">
          {/* Quick Student Selector */}
          <div className="flex items-center space-x-1.5 bg-black/40 border border-white/10 rounded-xl px-2 py-0.5">
            <span className="text-[10px] text-white/50">Viewing:</span>
            <select
              value={activeEnrollNo}
              onChange={(e) => {
                sfx.tap();
                setActiveEnrollNo(e.target.value);
              }}
              className="bg-transparent text-white font-medium text-xs outline-none cursor-pointer max-w-[190px] truncate"
            >
              {cohortStudents.map(s => (
                <option key={s.enrollNo} value={s.enrollNo} className="bg-[#18191D] text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dev Debug Ledger Restore */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Restore official institutional records? All modifications will be synchronized with the verified Mechatronics A ledger.')) {
                sfx.tap();
                handleResetCohortSeed();
              }
            }}
            className="p-1.5 px-2.5 rounded-xl bg-black/40 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 tap-spring flex items-center space-x-1.5 text-xs"
            title="Restore Institutional Ledger (Debug Reset)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Restore Ledger</span>
          </button>

          {/* Dev Reset 1-Time Student Setup */}
          <button
            type="button"
            onClick={() => {
              sfx.tap();
              localStorage.removeItem('X75_STUDENT_SETUP_DONE');
              setIsStudentSetupDone(false);
              setRole('student');
            }}
            className="p-1.5 px-2.5 rounded-xl bg-black/40 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 tap-spring flex items-center space-x-1 text-xs"
            title="Reset 1-Time Setup (Test Onboarding)"
          >
            <span>Reset Setup</span>
          </button>
        </div>
      </header>

      {/* Main Application Container (Edge-to-edge on mobile, framed on desktop sm:max-w-[400px]) */}
      <div 
        className="w-full max-w-full sm:max-w-[400px] h-[100dvh] sm:h-[844px] sm:max-h-[88vh] flex flex-col justify-between overflow-hidden relative shadow-2xl transition-all duration-300 sm:rounded-[28px] sm:border sm:border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)]"
      >
        {role === 'admin' ? (
          /* Android Admin App with Password Auth (pass6789) */
          <AdminMobileView
            students={cohortStudents}
            holidays={cohortHolidays}
            attendance={cohortAttendance}
            onBatchUpdateAttendance={handleAdminBatchUpdate}
            onAddHoliday={handleAdminAddHoliday}
            onRemoveHoliday={handleAdminRemoveHoliday}
            onSelectStudentView={(enrollNo) => {
              setActiveEnrollNo(enrollNo);
              setRole('student');
              setActiveTab('status');
            }}
            accentColor={accentColor}
            onSelectAccent={handleSelectAccent}
            isDark={isDark}
            setIsDark={handleToggleDarkMode}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onCohortSync={({ students: syncedStudents, holidays: syncedHolidays, attendance: syncedAttendance }) => {
              if (syncedStudents) {
                setCohortStudents(syncedStudents);
                saveCohortStudents(syncedStudents);
              }
              if (syncedHolidays) {
                setCohortHolidays(syncedHolidays);
                saveCohortHolidays(syncedHolidays);
              }
              if (syncedAttendance) {
                setCohortAttendance(syncedAttendance);
                saveCohortAttendance(syncedAttendance);
              }
            }}
          />
        ) : !isStudentSetupDone ? (
          /* Student 1-Time Initial Setup & Passkey Auth */
          <StudentInitialSetup
            students={cohortStudents}
            onComplete={(enrollNo) => {
              setActiveEnrollNo(enrollNo);
              setIsStudentSetupDone(true);
            }}
            accentColor={accentColor}
          />
        ) : (
          /* Student View-Only App */
          <>
            {/* Top Wordmark Bar (With Safe Area Clearance) */}
            <div className="pt-[max(2.75rem,env(safe-area-inset-top,0px))] sm:pt-5 pb-2 px-6 select-none flex items-center justify-between shrink-0">
              <span className="font-display font-extrabold text-lg tracking-tight text-[var(--color-text-primary)] lowercase flex items-baseline">
                x<span style={{ color: (accentColor === '#FFFFFF' || accentColor === '#000000') ? (isDark ? '#FFFFFF' : '#121316') : (accentColor || 'var(--color-primary)') }}>75</span>
              </span>
              {import.meta.env.VITE_APP_ROLE === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    sfx.tap();
                    setRole('admin');
                  }}
                  className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center space-x-1 tap-spring"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back to Admin</span>
                </button>
              )}
            </div>

            {/* View Switcher: Status / Calendar / Settings */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
              {activeTab === 'status' && (
                <StatusView
                  stats={stats}
                  todayStr={todayStr}
                  todayRecord={todayRecord}
                  accentColor={accentColor}
                  isReadOnly={true}
                  studentName={currentStudent.name}
                  enrollNo={currentStudent.enrollNo}
                />
              )}

              {activeTab === 'calendar' && (
                <CalendarView
                  records={currentStudentMergedRecords}
                  onUpdateRecord={() => {}}
                  onBatchUpdateRecords={() => {}}
                  accentColor={accentColor}
                  isReadOnly={true}
                />
              )}

              {activeTab === 'config' && (
                <ConfigView
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  accentColor={accentColor}
                  onSelectAccent={handleSelectAccent}
                  isDark={isDark}
                  setIsDark={handleToggleDarkMode}
                  studentName={currentStudent.name}
                  onSwitchStudent={() => setIsStudentModalOpen(true)}
                />
              )}
            </main>

            {/* Bottom Mobile Tab Bar (Visible in Student View) */}
            <BottomNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              accentColor={accentColor}
            />
          </>
        )}
      </div>

      {/* STUDENT PASSKEY SWITCH USER MODAL */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[var(--color-surface-card)] rounded-3xl border border-[var(--color-border)] p-4 shadow-2xl space-y-3.5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <div>
                <span className="font-display font-bold text-sm text-[var(--color-text-primary)] block">
                  Switch User
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  Enter 6-digit passkey
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sfx.tap();
                  setIsStudentModalOpen(false);
                }}
                className="w-7 h-7 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center tap-spring"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 6-Digit Passkey Input (Masked, Sanitized against Injection) */}
            <div className="space-y-1">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Passkey"
                value={studentSearchQuery}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9a-zA-Z]/g, '');
                  setStudentSearchQuery(val);
                  // Auto-auth if exact 6-digit match found
                  const matched = cohortStudents.find(s => s.enrollNo === val);
                  if (matched) {
                    sfx.confirm();
                    setActiveEnrollNo(matched.enrollNo);
                    setTimeout(() => {
                      setIsStudentModalOpen(false);
                      setStudentSearchQuery('');
                    }, 250);
                  }
                }}
                autoFocus
                className="w-full text-center tracking-widest font-apple-num font-bold text-lg py-2 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {/* Student Names List (Zero Roll Numbers / Passkeys Displayed) */}
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {filteredStudents.map((stu) => {
                const isSelected = stu.enrollNo === activeEnrollNo;
                return (
                  <button
                    key={stu.enrollNo}
                    type="button"
                    onClick={() => {
                      sfx.confirm();
                      setActiveEnrollNo(stu.enrollNo);
                      setIsStudentModalOpen(false);
                      setStudentSearchQuery('');
                    }}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between tap-spring transition-all ${
                      isSelected
                        ? 'bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/40 text-[var(--color-text-primary)]'
                        : 'bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-transparent'
                    }`}
                  >
                    <span className="text-xs font-bold block truncate text-[var(--color-text-primary)]">
                      {stu.name}
                    </span>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[var(--color-border)] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  sfx.tap();
                  setIsStudentModalOpen(false);
                  setStudentSearchQuery('');
                }}
                className="py-1.5 px-4 rounded-xl text-xs font-semibold bg-[var(--color-text-primary)] text-[var(--color-bg-base)] tap-spring"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub 1-Time Update Intimation Modal */}
      <UpdateModal
        updateInfo={updateInfo}
        onDismiss={() => {
          if (updateInfo?.latestVersion) {
            dismissUpdateNotification(updateInfo.latestVersion);
          }
          setUpdateInfo(null);
        }}
      />

    </div>
  );
}
