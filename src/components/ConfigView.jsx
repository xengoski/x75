import React from 'react';
import { Moon, Sun, Volume2, VolumeX, Smartphone, ArrowLeftRight } from 'lucide-react';
import { sfx } from '../utils/audio';
import { ColorSpectrumPicker } from './common/ColorSpectrumPicker';

export const ConfigView = ({
  settings,
  onUpdateSettings,
  accentColor,
  onSelectAccent,
  isDark,
  setIsDark,
  studentName = '',
  onSwitchStudent
}) => {
  const minThreshold = settings.minThreshold || 75;
  const feedbackMode = settings.feedbackMode || 'sound'; // 'sound' | 'vibrate' | 'off'

  const handleThresholdChange = (val) => {
    const num = parseInt(val, 10) || 75;
    onUpdateSettings({ ...settings, minThreshold: num });
  };

  const handleFeedbackChange = (mode) => {
    if (feedbackMode === mode) return;
    onUpdateSettings({ ...settings, feedbackMode: mode });
    sfx.setMode(mode);
    if (mode === 'sound') sfx.tap();
    else if (mode === 'vibrate') sfx.haptic('medium');
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 select-none overflow-y-auto space-y-5 animate-view">
      
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] px-1 font-display">
          Settings
        </h2>

        {/* Student Profile Card (Hyperminimal: Name + Mechatronics A + Switch User Button) */}
        {studentName && (
          <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] flex items-center justify-between shadow-xs text-left">
            <div className="min-w-0 pr-2 space-y-0.5">
              <span className="text-sm font-bold text-[var(--color-text-primary)] block truncate">
                {studentName}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)] block font-medium">
                Mechatronics A
              </span>
            </div>

            {onSwitchStudent && (
              <button
                type="button"
                onClick={() => {
                  sfx.tap();
                  onSwitchStudent();
                }}
                className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] tap-spring flex items-center space-x-1.5 shrink-0"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                <span>Switch User</span>
              </button>
            )}
          </div>
        )}

        {/* Target Threshold */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
              Target Threshold
            </span>
            <span className="font-apple-num text-lg font-bold text-[var(--color-text-primary)]">
              {minThreshold}%
            </span>
          </div>

          <input
            type="range"
            min="50"
            max="95"
            step="1"
            value={minThreshold}
            onChange={(e) => handleThresholdChange(e.target.value)}
            className="w-full h-1.5 rounded-full cursor-pointer bg-[var(--color-surface-secondary)] accent-[var(--color-primary)]"
          />

          <div className="flex justify-between text-[11px] font-apple-num text-[var(--color-text-tertiary)] px-0.5">
            <span>50%</span>
            <span className="text-[var(--color-text-primary)] font-semibold">75% (Standard)</span>
            <span>95%</span>
          </div>
        </div>

        {/* Feedback & Haptics (Zero Subtext Clutter) */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] space-y-3 shadow-xs">
          <div className="text-left">
            <span className="text-xs font-semibold text-[var(--color-text-primary)] block">
              Feedback & Haptics
            </span>
          </div>

          <div className="relative flex p-1 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] w-full select-none h-9 items-center overflow-hidden">
            {/* Sliding Active Pill Background */}
            <div 
              className="absolute top-1 bottom-1 rounded-full bg-[var(--color-surface-card)] shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)] pointer-events-none"
              style={{
                left: '4px',
                width: 'calc((100% - 8px) / 3)',
                transform: feedbackMode === 'sound' ? 'translateX(0%)' : feedbackMode === 'vibrate' ? 'translateX(100%)' : 'translateX(200%)'
              }}
            />

            <button
              type="button"
              onClick={() => handleFeedbackChange('sound')}
              className={`relative z-10 flex-1 h-full rounded-full text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-200 ${
                feedbackMode === 'sound' ? 'text-[var(--color-text-primary)] font-bold' : 'text-[var(--color-text-secondary)] opacity-70 hover:opacity-100'
              }`}
            >
              <Volume2 className={`w-3.5 h-3.5 transition-transform duration-300 ${feedbackMode === 'sound' ? 'scale-110 text-[var(--color-primary)]' : 'scale-90'}`} />
              <span>Sound</span>
            </button>

            <button
              type="button"
              onClick={() => handleFeedbackChange('vibrate')}
              className={`relative z-10 flex-1 h-full rounded-full text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-200 ${
                feedbackMode === 'vibrate' ? 'text-[var(--color-text-primary)] font-bold' : 'text-[var(--color-text-secondary)] opacity-70 hover:opacity-100'
              }`}
            >
              <Smartphone className={`w-3.5 h-3.5 transition-transform duration-300 ${feedbackMode === 'vibrate' ? 'scale-110 text-[var(--color-primary)]' : 'scale-90'}`} />
              <span>Vibrate</span>
            </button>

            <button
              type="button"
              onClick={() => handleFeedbackChange('off')}
              className={`relative z-10 flex-1 h-full rounded-full text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-200 ${
                feedbackMode === 'off' ? 'text-[var(--color-text-primary)] font-bold' : 'text-[var(--color-text-secondary)] opacity-70 hover:opacity-100'
              }`}
            >
              <VolumeX className={`w-3.5 h-3.5 transition-transform duration-300 ${feedbackMode === 'off' ? 'scale-110 text-[var(--color-primary)]' : 'scale-90'}`} />
              <span>Off</span>
            </button>
          </div>
        </div>

        {/* Accent Color (Curated Swatches + Visual Rainbow Spectrum Slider - Zero Hex) */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] shadow-xs text-left">
          <ColorSpectrumPicker
            accentColor={accentColor}
            onSelectAccent={onSelectAccent}
            isDark={isDark}
          />
        </div>

        {/* Appearance (Zero Subtext Clutter) */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] flex items-center justify-between shadow-xs">
          <div className="text-left">
            <span className="text-xs font-semibold text-[var(--color-text-primary)] block">
              Appearance
            </span>
          </div>

          <div className="relative flex p-1 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] w-[164px] select-none h-9 items-center overflow-hidden">
            {/* Sliding Active Pill Background */}
            <div 
              className="absolute top-1 bottom-1 rounded-full bg-[var(--color-surface-card)] shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)] pointer-events-none"
              style={{
                left: '4px',
                width: 'calc(50% - 4px)',
                transform: isDark ? 'translateX(100%)' : 'translateX(0%)'
              }}
            />

            <button
              type="button"
              onClick={() => {
                sfx.tap();
                setIsDark(false);
              }}
              className={`relative z-10 flex-1 h-full rounded-full text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-200 ${
                !isDark ? 'text-[var(--color-text-primary)] font-bold' : 'text-[var(--color-text-secondary)] opacity-70 hover:opacity-100'
              }`}
            >
              <Sun className={`w-3.5 h-3.5 transition-transform duration-300 ${!isDark ? 'rotate-0 scale-110 text-[#FF9500]' : '-rotate-45 scale-90'}`} />
              <span>Light</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sfx.tap();
                setIsDark(true);
              }}
              className={`relative z-10 flex-1 h-full rounded-full text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-200 ${
                isDark ? 'text-[var(--color-text-primary)] font-bold' : 'text-[var(--color-text-secondary)] opacity-70 hover:opacity-100'
              }`}
            >
              <Moon className={`w-3.5 h-3.5 transition-transform duration-300 ${isDark ? 'rotate-0 scale-110 text-[var(--color-primary)]' : 'rotate-45 scale-90'}`} />
              <span>Dark</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
