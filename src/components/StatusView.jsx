import React from 'react';
import { Check, X, Briefcase, Star, RotateCcw } from 'lucide-react';
import { sfx } from '../utils/audio';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

export const StatusView = ({
  stats,
  todayStr,
  todayRecord,
  onMarkToday,
  onClearToday,
  accentColor
}) => {
  const {
    percentage,
    isSafe,
    safeLeaves,
    daysNeeded,
    attendedDays,
    conductedDays,
    holidayDays,
    target
  } = stats;

  const currentStatus = todayRecord?.status || 'UNRECORDED';

  // Smooth number counting animations
  const animPercentage = useAnimatedNumber(percentage, 550, 1);
  const animAttended = useAnimatedNumber(attendedDays, 450, 0);
  const animConducted = useAnimatedNumber(conductedDays, 450, 0);
  const animHolidays = useAnimatedNumber(holidayDays, 450, 0);
  const animSafeLeaves = useAnimatedNumber(safeLeaves, 450, 0);
  const animDaysNeeded = useAnimatedNumber(daysNeeded, 450, 0);

  // Format date cleanly in ONE place: e.g. "Nov 25, 2026"
  const dateObj = new Date(todayStr + 'T00:00:00');
  const isSunday = dateObj.getDay() === 0;
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="flex-1 flex flex-col justify-between p-6 select-none overflow-y-auto animate-view">
      
      {/* Optically Centered Hero Section (Centered Between Top and Bottom Dock) */}
      <div className="flex-1 flex flex-col justify-center space-y-7 -mt-3">
        
        {/* Main Stat Block - Strictly Left-Aligned Across All Screen Ratios */}
        <div className="space-y-1 text-left">
          <div>
            <span className="text-xs font-medium text-[var(--color-text-secondary)] tracking-tight">
              Attendance
            </span>
          </div>
          
          <div className="flex items-baseline justify-start space-x-1.5 pt-0.5">
            <span className="font-apple-num text-7xl sm:text-8xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {animPercentage}
            </span>
            <span className="text-3xl sm:text-4xl font-semibold text-[var(--color-text-tertiary)] font-apple-num">
              %
            </span>
          </div>

          {/* Single clean sentence for leave margin */}
          <div className="pt-1 text-left">
            {conductedDays === 0 ? (
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                No classes recorded yet. Log attendance below or import JSON.
              </p>
            ) : isSafe ? (
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                <strong className="text-[var(--color-text-primary)] font-semibold text-base">{animSafeLeaves} {animSafeLeaves === 1 ? 'day' : 'days'}</strong> of leave available
              </p>
            ) : (
              <p className="text-sm font-medium text-[var(--color-absent-text)]">
                Must attend <strong className="font-semibold text-base text-[var(--color-text-primary)]">{animDaysNeeded} consecutive {animDaysNeeded === 1 ? 'day' : 'days'}</strong> to reach {target}%
              </p>
            )}
          </div>
        </div>

        {/* Minimal Progress Track with Target notch */}
        <div className="space-y-2 pt-0.5">
          <div className="relative w-full h-2 rounded-full bg-[var(--color-surface-secondary)] overflow-visible border border-[var(--color-border-subtle)]">
            {/* Target Hairline Tick */}
            <div 
              className="absolute -top-1.5 -bottom-1.5 w-[2px] bg-[var(--color-text-primary)] z-10 rounded-full shadow-xs"
              style={{ left: `${target}%` }}
              title={`Target: ${target}%`}
            >
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 font-apple-num text-[10px] text-[var(--color-text-secondary)] whitespace-nowrap font-medium">
                {target}%
              </span>
            </div>

            {/* Progress Fill with fluid spring animation */}
            <div 
              className="h-full rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ 
                width: `${Math.min(100, percentage)}%`,
                backgroundColor: (conductedDays === 0 || isSafe) ? (accentColor || '#007AFF') : 'var(--color-absent)'
              }}
            />
          </div>
        </div>

        {/* Modern 3-Cell Telemetry Container */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] grid grid-cols-3 gap-2 text-center shadow-xs">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-[var(--color-text-secondary)] block">Attended</span>
            <span className="font-apple-num text-lg font-bold text-[var(--color-text-primary)]">{animAttended}</span>
          </div>
          <div className="border-x border-[var(--color-border)] space-y-0.5">
            <span className="text-[11px] font-medium text-[var(--color-text-secondary)] block">Conducted</span>
            <span className="font-apple-num text-lg font-bold text-[var(--color-text-primary)]">{animConducted}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-[var(--color-text-secondary)] block">Holidays</span>
            <span className="font-apple-num text-lg font-bold text-[var(--color-text-primary)]">{animHolidays}</span>
          </div>
        </div>

      </div>

      {/* Daily Input Section Anchored at the Bottom */}
      <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
        {/* Date + Indicator */}
        <div className="flex items-center justify-between min-h-[22px]">
          <span className="text-xs font-semibold text-[var(--color-text-primary)] tracking-tight">
            {formattedDate}
          </span>
          
          {currentStatus === 'UNRECORDED' ? (
            isSunday ? (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-holiday-subtle)] text-[var(--color-holiday-text)]">
                Sunday (Off)
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-[var(--color-text-tertiary)] bg-[var(--color-surface-secondary)] border border-[var(--color-border-subtle)]">
                Unrecorded
              </span>
            )
          ) : currentStatus === 'HOLIDAY' ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-holiday-subtle)] text-[var(--color-holiday-text)]">
              {todayRecord?.note || 'Holiday'}
            </span>
          ) : currentStatus === 'DUTY_LEAVE' ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-duty-subtle)] text-[var(--color-duty-text)]">
              On Duty
            </span>
          ) : null}
        </div>

        {/* Primary Action Buttons: Clean Borderless Tonal Fills */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              sfx.present();
              onMarkToday('PRESENT');
            }}
            className={`py-3 px-4 rounded-xl text-sm tap-spring flex items-center justify-center space-x-1.5 transition-all ${
              currentStatus === 'PRESENT'
                ? 'bg-[var(--color-present)]/20 text-[var(--color-present-text)] font-bold border border-transparent shadow-xs'
                : 'bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] font-semibold'
            }`}
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Present</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.absent();
              onMarkToday('ABSENT');
            }}
            className={`py-3 px-4 rounded-xl text-sm tap-spring flex items-center justify-center space-x-1.5 transition-all ${
              currentStatus === 'ABSENT'
                ? 'bg-[var(--color-absent)]/20 text-[var(--color-absent-text)] font-bold border border-transparent shadow-xs'
                : 'bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] font-semibold'
            }`}
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <span>Absent</span>
          </button>
        </div>

        {/* Secondary Actions: On Duty & Holiday */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              sfx.tap();
              onMarkToday('DUTY_LEAVE');
            }}
            className={`py-2 px-3 rounded-xl text-xs tap-spring flex items-center justify-center space-x-1.5 transition-all ${
              currentStatus === 'DUTY_LEAVE'
                ? 'bg-[var(--color-duty)]/20 text-[var(--color-duty-text)] font-bold border border-transparent shadow-xs'
                : 'bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] font-medium'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>On Duty</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.tap();
              onMarkToday('HOLIDAY');
            }}
            className={`py-2 px-3 rounded-xl text-xs tap-spring flex items-center justify-center space-x-1.5 transition-all ${
              currentStatus === 'HOLIDAY'
                ? 'bg-[var(--color-holiday)]/20 text-[var(--color-holiday-text)] font-bold border border-transparent shadow-xs'
                : 'bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] font-medium'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Holiday</span>
          </button>
        </div>

        {/* Clear Option Slot - persistent height prevents any layout shift */}
        <div className={`text-center h-6 flex items-center justify-center transition-opacity duration-200 ${
          currentStatus !== 'UNRECORDED' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <button
            type="button"
            onClick={() => {
              sfx.tap();
              onClearToday();
            }}
            tabIndex={currentStatus !== 'UNRECORDED' ? 0 : -1}
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] tap-spring inline-flex items-center space-x-1 py-0.5 px-2"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset today</span>
          </button>
        </div>
      </div>

    </div>
  );
};
