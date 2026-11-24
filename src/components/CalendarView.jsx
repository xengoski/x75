import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, X, Star, Briefcase, Trash2, Menu, CalendarRange } from 'lucide-react';
import { sfx } from '../utils/audio';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { getLocalDateStr } from '../utils/storage';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CalendarView = ({
  records,
  onUpdateRecord,
  onBatchUpdateRecords,
  accentColor
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slideDirection, setSlideDirection] = useState(null); // 'left' | 'right' | null
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [holidayNote, setHolidayNote] = useState('');

  // Semi-Hidden 3-Bar Batch Fill Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchStart, setBatchStart] = useState('');
  const [batchEnd, setBatchEnd] = useState('');
  const [batchStatus, setBatchStatus] = useState('PRESENT');
  const [batchNote, setBatchNote] = useState('');
  const [batchSkipSundays, setBatchSkipSundays] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    sfx.tap();
    setSlideDirection('right');
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    sfx.tap();
    setSlideDirection('left');
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  // Local-safe today string (Fixing UTC bug)
  const todayStr = getLocalDateStr(new Date());

  // Calculate unboxed month counts (Sundays auto-recognized as defined holidays)
  let rawPresent = 0;
  let rawAbsent = 0;
  let rawHoliday = 0;
  let rawDuty = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month, d).getDay();
    const isSunday = dayOfWeek === 0;
    const rec = records[dStr];

    const effStatus = rec?.status || (isSunday ? 'HOLIDAY' : 'UNRECORDED');

    if (effStatus === 'PRESENT') rawPresent++;
    else if (effStatus === 'ABSENT') rawAbsent++;
    else if (effStatus === 'HOLIDAY') rawHoliday++;
    else if (effStatus === 'DUTY_LEAVE') rawDuty++;
  }

  // Animated month tally numbers
  const animPresent = useAnimatedNumber(rawPresent, 400, 0);
  const animAbsent = useAnimatedNumber(rawAbsent, 400, 0);
  const animHoliday = useAnimatedNumber(rawHoliday, 400, 0);
  const animDuty = useAnimatedNumber(rawDuty, 400, 0);

  const handleDayClick = (dayNum) => {
    sfx.tap();
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    setSelectedDateStr(dStr);
    const dayOfWeek = new Date(year, month, dayNum).getDay();
    const isSunday = dayOfWeek === 0;
    const existing = records[dStr] || (isSunday ? { status: 'HOLIDAY', note: 'Sunday' } : null);

    setHolidayNote(existing?.status === 'HOLIDAY' ? (existing?.note || 'Sunday') : '');
    setIsModalOpen(true);
  };

  const selectedDayOfWeek = selectedDateStr ? new Date(selectedDateStr + 'T00:00:00').getDay() : -1;
  const isSelectedSunday = selectedDayOfWeek === 0;
  const selectedRecord = selectedDateStr 
    ? (records[selectedDateStr] || (isSelectedSunday ? { status: 'HOLIDAY', note: 'Sunday' } : { status: 'UNRECORDED', note: '' })) 
    : null;

  const handleSetStatus = (status, note = '') => {
    sfx.tap();
    if (!selectedDateStr) return;
    if (status === 'UNRECORDED') {
      onUpdateRecord(selectedDateStr, null);
    } else {
      onUpdateRecord(selectedDateStr, { 
        status, 
        note: status === 'HOLIDAY' ? (holidayNote.trim() || (isSelectedSunday ? 'Sunday' : 'Holiday')) : note 
      });
    }
  };

  const handleClearRecord = () => {
    sfx.tap();
    if (!selectedDateStr) return;
    onUpdateRecord(selectedDateStr, null);
    setIsModalOpen(false);
  };

  // Open Batch Fill Modal pre-seeded with current month
  const openBatchModal = () => {
    sfx.tap();
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    setBatchStart(startStr);
    setBatchEnd(endStr);
    setBatchStatus('PRESENT');
    setBatchNote('');
    setBatchSkipSundays(true);
    setIsBatchModalOpen(true);
  };

  // Execute Batch Fill across date range
  const handleApplyBatchFill = () => {
    if (!batchStart || !batchEnd) return;
    const start = new Date(batchStart + 'T00:00:00');
    const end = new Date(batchEnd + 'T00:00:00');
    if (start > end) {
      alert('Start date must be before or equal to End date');
      return;
    }

    const updates = {};
    const cur = new Date(start);
    while (cur <= end) {
      const dStr = getLocalDateStr(cur);
      const isSun = cur.getDay() === 0;

      if (isSun && batchSkipSundays) {
        updates[dStr] = { status: 'HOLIDAY', note: 'Sunday' };
      } else {
        updates[dStr] = { 
          status: batchStatus, 
          note: batchStatus === 'HOLIDAY' ? (batchNote.trim() || 'Holiday') : (batchStatus === 'DUTY_LEAVE' ? 'On Duty' : (batchStatus === 'ABSENT' ? 'Leave' : ''))
        };
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (onBatchUpdateRecords) {
      onBatchUpdateRecords(updates);
    } else {
      Object.entries(updates).forEach(([k, v]) => onUpdateRecord(k, v));
    }

    sfx.confirm();
    setIsBatchModalOpen(false);
  };

  const daysCells = [];
  for (let i = 0; i < firstDay; i++) {
    daysCells.push(<div key={`pad-${i}`} className="h-10" />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month, d).getDay();
    const isSunday = dayOfWeek === 0;
    const rec = records[dStr];
    const isToday = (dStr === todayStr);

    const effStatus = rec?.status || (isSunday ? 'HOLIDAY' : null);

    let indicatorColor = null;
    if (effStatus === 'PRESENT') indicatorColor = 'bg-[var(--color-present)]';
    else if (effStatus === 'ABSENT') indicatorColor = 'bg-[var(--color-absent)]';
    else if (effStatus === 'HOLIDAY') indicatorColor = 'bg-[var(--color-holiday)]';
    else if (effStatus === 'DUTY_LEAVE') indicatorColor = 'bg-[var(--color-duty)]';

    daysCells.push(
      <button
        key={dStr}
        type="button"
        onClick={() => handleDayClick(d)}
        className="h-11 flex flex-col items-center justify-center relative rounded-xl hover:bg-[var(--color-surface-secondary)] tap-spring transition-colors"
      >
        <span 
          className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-apple-num font-medium leading-none transition-all ${
            isToday 
              ? 'text-white font-bold shadow-xs' 
              : 'text-[var(--color-text-primary)]'
          }`}
          style={isToday ? { backgroundColor: accentColor || '#007AFF' } : {}}
        >
          {d}
        </span>
        
        {/* Sleek Modern Micro-Dash Indicator */}
        <div className="h-1 flex items-center justify-center mt-1">
          {indicatorColor && (
            <span 
              className={`w-3.5 h-[2.5px] rounded-full ${indicatorColor} transition-all duration-200`} 
            />
          )}
        </div>
      </button>
    );
  }

  // Format selected date
  const selectedDateFormatted = selectedDateStr ? new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : '';

  return (
    <div className="flex-1 flex flex-col justify-between p-5 select-none overflow-y-auto animate-view space-y-4">
      
      <div>
        {/* Month Navigation Header with Semi-Hidden 3-Bar Menu */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center space-x-2">
            <span className="font-display font-bold text-base text-[var(--color-text-primary)] tracking-tight">
              {MONTHS[month]} {year}
            </span>

            {/* Semi-Hidden 3-Bar Menu Button for Batch Fill */}
            <button
              type="button"
              onClick={openBatchModal}
              className="p-1 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] tap-spring transition-colors"
              title="Batch Fill Attendance"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] tap-spring"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] tap-spring"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Weekday Row */}
        <div className="grid grid-cols-7 gap-1 text-center pb-2 text-xs font-semibold text-[var(--color-text-tertiary)]">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, idx) => (
            <span key={idx} className={idx === 0 ? 'text-[var(--color-holiday-text)]' : ''}>{w}</span>
          ))}
        </div>

        {/* Calendar Day Grid with Smooth Slide Transition */}
        <div 
          key={`${year}-${month}`} 
          className={`grid grid-cols-7 gap-1 pt-1 ${
            slideDirection === 'left' 
              ? 'animate-slide-left' 
              : slideDirection === 'right' 
              ? 'animate-slide-right' 
              : ''
          }`}
        >
          {daysCells}
        </div>

        {/* Minimal Unboxed Legend & Monthly Count Tally */}
        <div className="mt-6 pt-3.5 border-t border-[var(--color-border)] grid grid-cols-4 gap-1 text-center select-none">
          <div className="flex flex-col items-center space-y-0.5">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-[2.5px] rounded-full bg-[var(--color-present)]" />
              <span className="font-apple-num text-sm font-bold text-[var(--color-text-primary)]">{animPresent}</span>
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">Present</span>
          </div>

          <div className="flex flex-col items-center space-y-0.5">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-[2.5px] rounded-full bg-[var(--color-absent)]" />
              <span className="font-apple-num text-sm font-bold text-[var(--color-text-primary)]">{animAbsent}</span>
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">Absent</span>
          </div>

          <div className="flex flex-col items-center space-y-0.5">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-[2.5px] rounded-full bg-[var(--color-holiday)]" />
              <span className="font-apple-num text-sm font-bold text-[var(--color-text-primary)]">{animHoliday}</span>
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">Holiday</span>
          </div>

          <div className="flex flex-col items-center space-y-0.5">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-[2.5px] rounded-full bg-[var(--color-duty)]" />
              <span className="font-apple-num text-sm font-bold text-[var(--color-text-primary)]">{animDuty}</span>
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">On Duty</span>
          </div>
        </div>
      </div>

      <div className="text-xs text-[var(--color-text-tertiary)] text-center pt-1 font-normal tracking-tight">
        Tap any date to log or revise
      </div>

      {/* Floating Action Capsule (Individual Date Modal) */}
      {isModalOpen && selectedDateStr && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[340px] bg-[var(--color-surface-card)] rounded-3xl border border-[var(--color-border)] p-4 shadow-2xl space-y-3.5 animate-in zoom-in-95 duration-200">
            
            {/* Header: Date + Current Status Pill + Close */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <div>
                <span className="font-display font-bold text-sm text-[var(--color-text-primary)] block">
                  {selectedDateFormatted}
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  {selectedRecord?.note || (isSelectedSunday ? 'Sunday Holiday' : 'Select Status')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center tap-spring"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4-Way Segmented Tactile Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Present */}
              <button
                type="button"
                onClick={() => handleSetStatus('PRESENT', '')}
                className={`p-3 rounded-2xl flex items-center space-x-2 tap-spring transition-all ${
                  selectedRecord?.status === 'PRESENT'
                    ? 'bg-[var(--color-present)]/20 text-[var(--color-present-text)] font-bold border border-transparent shadow-xs'
                    : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-transparent hover:bg-[var(--color-surface-tertiary)]'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${selectedRecord?.status === 'PRESENT' ? 'bg-[var(--color-present)]/30 text-[var(--color-present-text)]' : 'bg-[var(--color-surface-card)] text-[var(--color-text-secondary)]'}`}>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-xs font-semibold">Present</span>
              </button>

              {/* Absent */}
              <button
                type="button"
                onClick={() => handleSetStatus('ABSENT', 'Leave')}
                className={`p-3 rounded-2xl flex items-center space-x-2 tap-spring transition-all ${
                  selectedRecord?.status === 'ABSENT'
                    ? 'bg-[var(--color-absent)]/20 text-[var(--color-absent-text)] font-bold border border-transparent shadow-xs'
                    : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-transparent hover:bg-[var(--color-surface-tertiary)]'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${selectedRecord?.status === 'ABSENT' ? 'bg-[var(--color-absent)]/30 text-[var(--color-absent-text)]' : 'bg-[var(--color-surface-card)] text-[var(--color-text-secondary)]'}`}>
                  <X className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-xs font-semibold">Absent</span>
              </button>

              {/* Holiday */}
              <button
                type="button"
                onClick={() => handleSetStatus('HOLIDAY', holidayNote || (isSelectedSunday ? 'Sunday' : 'Holiday'))}
                className={`p-3 rounded-2xl flex items-center space-x-2 tap-spring transition-all ${
                  selectedRecord?.status === 'HOLIDAY'
                    ? 'bg-[var(--color-holiday)]/20 text-[var(--color-holiday-text)] font-bold border border-transparent shadow-xs'
                    : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-transparent hover:bg-[var(--color-surface-tertiary)]'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${selectedRecord?.status === 'HOLIDAY' ? 'bg-[var(--color-holiday)]/30 text-[var(--color-holiday-text)]' : 'bg-[var(--color-surface-card)] text-[var(--color-text-secondary)]'}`}>
                  <Star className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-xs font-semibold">Holiday</span>
              </button>

              {/* On Duty */}
              <button
                type="button"
                onClick={() => handleSetStatus('DUTY_LEAVE', 'On Duty')}
                className={`p-3 rounded-2xl flex items-center space-x-2 tap-spring transition-all ${
                  selectedRecord?.status === 'DUTY_LEAVE'
                    ? 'bg-[var(--color-duty)]/20 text-[var(--color-duty-text)] font-bold border border-transparent shadow-xs'
                    : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-transparent hover:bg-[var(--color-surface-tertiary)]'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${selectedRecord?.status === 'DUTY_LEAVE' ? 'bg-[var(--color-duty)]/30 text-[var(--color-duty-text)]' : 'bg-[var(--color-surface-card)] text-[var(--color-text-secondary)]'}`}>
                  <Briefcase className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-xs font-semibold">On Duty</span>
              </button>
            </div>

            {/* Inline Holiday Label Field if Holiday is Active */}
            {selectedRecord?.status === 'HOLIDAY' && (
              <div className="p-2.5 rounded-2xl bg-[var(--color-surface-secondary)] space-y-2 animate-view">
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                  Holiday Label
                </span>
                <input
                  type="text"
                  value={holidayNote}
                  placeholder="e.g. Festival, Sunday, Fest"
                  onChange={(e) => {
                    const val = e.target.value;
                    setHolidayNote(val);
                    onUpdateRecord(selectedDateStr, { status: 'HOLIDAY', note: val });
                  }}
                  className="w-full text-xs py-1.5 px-2.5 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {['Sunday', 'College Fest', 'Break', 'National Holiday', 'Study Leave'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        sfx.tap();
                        setHolidayNote(tag);
                        onUpdateRecord(selectedDateStr, { status: 'HOLIDAY', note: tag });
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-[var(--color-surface-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] tap-spring"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer: Done & Clear */}
            <div className="pt-1 flex items-center justify-between">
              {selectedRecord?.status !== 'UNRECORDED' ? (
                <button
                  type="button"
                  onClick={handleClearRecord}
                  className="text-xs text-[var(--color-absent-text)] hover:opacity-80 tap-spring flex items-center space-x-1 py-1 px-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="py-1.5 px-4 rounded-xl text-xs font-semibold bg-[var(--color-text-primary)] text-[var(--color-bg-base)] tap-spring"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Semi-Hidden 3-Bar Batch Fill Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[360px] bg-[var(--color-surface-card)] rounded-3xl border border-[var(--color-border)] p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-xl bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-primary)]">
                  <CalendarRange className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-[var(--color-text-primary)] block">
                    Batch Log Attendance
                  </span>
                  <span className="text-[10px] text-[var(--color-text-secondary)]">
                    Log multiple dates in one tap
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center tap-spring"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Date Range Inputs */}
            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-[var(--color-text-secondary)] block">
                  From Date
                </label>
                <input
                  type="date"
                  value={batchStart}
                  onChange={(e) => setBatchStart(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-[var(--color-text-secondary)] block">
                  To Date
                </label>
                <input
                  type="date"
                  value={batchEnd}
                  onChange={(e) => setBatchEnd(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Action State Choice */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-semibold text-[var(--color-text-secondary)] block">
                Status to Apply
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'PRESENT', label: 'Present', color: 'var(--color-present)' },
                  { id: 'ABSENT', label: 'Absent', color: 'var(--color-absent)' },
                  { id: 'DUTY_LEAVE', label: 'On Duty', color: 'var(--color-duty)' },
                  { id: 'HOLIDAY', label: 'Holiday', color: 'var(--color-holiday)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      sfx.tap();
                      setBatchStatus(item.id);
                    }}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold tap-spring transition-all border ${
                      batchStatus === item.id
                        ? 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] border-[var(--color-text-primary)] shadow-xs'
                        : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* If Holiday: Custom Note */}
            {batchStatus === 'HOLIDAY' && (
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-semibold text-[var(--color-text-secondary)] block">
                  Holiday Note
                </label>
                <input
                  type="text"
                  value={batchNote}
                  placeholder="e.g. Vacation, College Break, Fest"
                  onChange={(e) => setBatchNote(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            )}

            {/* Checkbox: Weekends only do defined holidays on Sundays */}
            <div className="flex items-center space-x-2 pt-1 text-left">
              <input
                type="checkbox"
                id="batchSkipSundays"
                checked={batchSkipSundays}
                onChange={(e) => setBatchSkipSundays(e.target.checked)}
                className="w-4 h-4 rounded-md accent-[var(--color-primary)] cursor-pointer"
              />
              <label htmlFor="batchSkipSundays" className="text-xs text-[var(--color-text-secondary)] cursor-pointer select-none">
                Define Sundays as Holidays
              </label>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="py-1.5 px-3 rounded-xl text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] tap-spring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBatchFill}
                className="py-2 px-4 rounded-xl text-xs font-semibold bg-[var(--color-primary)] text-white shadow-sm tap-spring"
              >
                Apply Range
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
