import React, { useState, useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { StatusView } from './components/StatusView';
import { CalendarView } from './components/CalendarView';
import { ConfigView } from './components/ConfigView';
import { BottomNav } from './components/BottomNav';

import { 
  loadStoredState, saveStoredState, exportDataAsJSON, getLocalDateStr, INITIAL_STATE 
} from './utils/storage';
import { applyThemeToDocument } from './utils/theme';
import { calculateDayAttendanceStats } from './utils/attendanceLogic';
import { sfx } from './utils/audio';

export default function App() {
  const [appState, setAppState] = useState(loadStoredState);
  const [activeTab, setActiveTab] = useState('status'); // 'status', 'calendar', 'config'

  const fileInputRef = useRef(null);

  const { records, settings } = appState;
  const accentColor = settings.accentColor || '#007AFF';
  const isDark = settings.isDarkMode !== false;
  const feedbackMode = settings.feedbackMode || 'sound';

  useEffect(() => {
    applyThemeToDocument(accentColor, isDark);
    sfx.setMode(feedbackMode);
  }, [accentColor, isDark, feedbackMode]);

  useEffect(() => {
    saveStoredState(appState);
  }, [appState]);

  // Native Android Hardware Back Button Handling via Capacitor
  useEffect(() => {
    let backHandle = null;
    const setupBack = async () => {
      try {
        backHandle = await CapApp.addListener('backButton', () => {
          if (activeTab !== 'status') {
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
  }, [activeTab]);

  // Keyboard navigation for desktop testing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '1') { sfx.tap(); setActiveTab('status'); }
      if (e.key === '2') { sfx.tap(); setActiveTab('calendar'); }
      if (e.key === '3') { sfx.tap(); setActiveTab('config'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calculate day-based attendance statistics
  const stats = calculateDayAttendanceStats(records, settings.minThreshold || 75);

  // Local-time safe today string (Fixing UTC midnight bug)
  const todayStr = getLocalDateStr(new Date());
  const todayRecord = records[todayStr];

  // Daily Marking Actions
  const handleMarkToday = (status) => {
    setAppState(prev => ({
      ...prev,
      records: {
        ...prev.records,
        [todayStr]: { status, note: status === 'DUTY_LEAVE' ? 'On Duty' : status === 'HOLIDAY' ? 'Holiday' : '' }
      }
    }));
  };

  const handleClearToday = () => {
    setAppState(prev => {
      const next = { ...prev.records };
      delete next[todayStr];
      return { ...prev, records: next };
    });
  };

  const handleUpdateRecord = (dateStr, data) => {
    setAppState(prev => {
      const next = { ...prev.records };
      if (!data) {
        delete next[dateStr];
      } else {
        next[dateStr] = data;
      }
      return { ...prev, records: next };
    });
  };

  // Semi-hidden Batch Fill Attendance Action
  const handleBatchUpdateRecords = (updates) => {
    setAppState(prev => ({
      ...prev,
      records: {
        ...prev.records,
        ...updates
      }
    }));
  };

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

  const handleExport = () => {
    exportDataAsJSON(appState);
  };

  // Clean Overwrite Import: Auto-removes any mock records
  const handleImportJsonData = (rawJson) => {
    try {
      const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      if (parsed && parsed.records) {
        setAppState({
          records: parsed.records,
          settings: {
            ...INITIAL_STATE.settings,
            ...(parsed.settings || {})
          }
        });
        sfx.confirm();
        const studentInfo = parsed.student?.name ? ` for ${parsed.student.name}` : '';
        const count = Object.keys(parsed.records).length;
        alert(`Successfully imported ${count} attendance records${studentInfo}!`);
      } else {
        alert('Invalid attendance format: missing "records" dictionary.');
      }
    } catch (e) {
      console.error('Failed to parse attendance JSON', e);
      alert('Could not parse imported attendance JSON file.');
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      handleImportJsonData(event.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // JSON Runner: Auto-load files opened via Android system Intent (ACTION_VIEW)
  useEffect(() => {
    const checkNativePendingJson = () => {
      try {
        if (window.JsonRunnerBridge && typeof window.JsonRunnerBridge.getPendingJson === 'function') {
          const raw = window.JsonRunnerBridge.getPendingJson();
          if (raw) {
            handleImportJsonData(raw);
          }
        }
      } catch (err) {
        console.error('Error checking JsonRunnerBridge', err);
      }
    };

    window.onOpenJsonFile = (jsonString) => {
      handleImportJsonData(jsonString);
    };

    let appUrlHandle = null;
    const setupCapUrl = async () => {
      try {
        appUrlHandle = await CapApp.addListener('appUrlOpen', () => {
          checkNativePendingJson();
        });
      } catch {
        // Desktop browser fallback
      }
    };
    setupCapUrl();

    checkNativePendingJson();
    const timer = setTimeout(checkNativePendingJson, 350);

    return () => {
      clearTimeout(timer);
      if (appUrlHandle && appUrlHandle.remove) appUrlHandle.remove();
      window.onOpenJsonFile = null;
    };
  }, []);

  // Wipe All Records for a Clean Semester Slate
  const handleWipeAllRecords = () => {
    setAppState(prev => ({
      ...prev,
      records: {}
    }));
    sfx.tap();
    alert('All attendance records wiped clean. Ready for new semester.');
  };

  // Download Shareable Attendance Template JSON
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/attendance_template.json');
      const data = await res.json();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const a = document.createElement('a');
      a.setAttribute("href", dataStr);
      a.setAttribute("download", "x75_attendance_template.json");
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('Failed to download template', e);
    }
  };

  return (
    /* Full Desktop Window: Blank Matte Background with Centered Mobile Phone Frame */
    <div className="w-screen h-screen bg-[#000000] flex items-center justify-center p-0 sm:p-4 select-none overflow-hidden">
      
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />

      {/* Forced Phone-Sized Aspect Ratio Container (Android / iPhone Frame) */}
      <div 
        className="w-full max-w-[400px] h-[100dvh] sm:h-[844px] sm:max-h-[92vh] flex flex-col justify-between overflow-hidden relative shadow-2xl transition-colors sm:rounded-[40px] sm:border sm:border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)]"
      >
        {/* Hyperminimalist Raw Top Wordmark with Safe Area Top Clearance */}
        <div className="pt-[max(2.75rem,env(safe-area-inset-top,0px))] sm:pt-6 pb-2 px-6 select-none flex items-center">
          <span className="font-display font-extrabold text-lg tracking-tight text-[var(--color-text-primary)] lowercase flex items-baseline">
            x<span style={{ color: (accentColor === '#FFFFFF' || accentColor === '#000000') ? (isDark ? '#FFFFFF' : '#121316') : (accentColor || 'var(--color-primary)') }}>75</span>
          </span>
        </div>

        {/* View Switcher: Status / Calendar / Settings */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'status' && (
            <StatusView
              stats={stats}
              todayStr={todayStr}
              todayRecord={todayRecord}
              onMarkToday={handleMarkToday}
              onClearToday={handleClearToday}
              accentColor={accentColor}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              records={records}
              onUpdateRecord={handleUpdateRecord}
              onBatchUpdateRecords={handleBatchUpdateRecords}
              accentColor={accentColor}
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
              onExport={handleExport}
              onImportClick={() => fileInputRef.current?.click()}
              onWipeAllRecords={handleWipeAllRecords}
              onDownloadTemplate={handleDownloadTemplate}
            />
          )}
        </main>

        {/* Bottom Mobile Tab Bar */}
        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          accentColor={accentColor}
        />
      </div>
    </div>
  );
}
