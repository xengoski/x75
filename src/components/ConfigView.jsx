import React from 'react';
import { Moon, Sun, Download, Upload, Check, Volume2, VolumeX, Smartphone, FileCode2, Trash2 } from 'lucide-react';
import { APPLE_ACCENTS } from '../utils/theme';
import { sfx } from '../utils/audio';

export const ConfigView = ({
  settings,
  onUpdateSettings,
  accentColor,
  onSelectAccent,
  isDark,
  setIsDark,
  onExport,
  onImportClick,
  onWipeAllRecords,
  onDownloadTemplate
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
    else if (mode === 'vibrate') sfx.haptic([15, 30, 15]);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 select-none overflow-y-auto space-y-5 animate-view">
      
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] px-1 font-display">
          Settings
        </h2>

        {/* Section 1: Target Threshold */}
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

        {/* Section 2: Feedback (Smooth Sliding 3-Pilled Control with Zero Clipping) */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] space-y-3 shadow-xs">
          <div>
            <span className="text-xs font-semibold text-[var(--color-text-primary)] block">
              Feedback & Haptics
            </span>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              {feedbackMode === 'sound' ? 'Audio clicks & haptics' : feedbackMode === 'vibrate' ? 'Haptics only' : 'Completely silent'}
            </span>
          </div>

          <div className="relative flex p-1 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] w-full select-none h-9 items-center overflow-hidden">
            {/* Sliding Active Pill Background with Bouncy Physical Spring */}
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

        {/* Section 3: Accent Color (Including Nothing Monochrome) */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] space-y-3 shadow-xs">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] block">
            Accent Color
          </span>

          <div className="flex items-center justify-between gap-1 sm:gap-1.5 flex-nowrap">
            {APPLE_ACCENTS.map((item) => {
              const isSelected = item.isMonochrome
                ? (accentColor?.toLowerCase() === '#ffffff' || accentColor === 'monochrome')
                : (accentColor || '#007AFF').toLowerCase() === item.color.toLowerCase();

              const swatchBg = item.isMonochrome 
                ? (isDark ? '#FFFFFF' : '#121316') 
                : item.color;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    sfx.tap();
                    onSelectAccent(item.color);
                  }}
                  className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center tap-spring border border-[var(--color-border)] ${
                    isSelected ? 'scale-110 ring-2 ring-offset-2 ring-offset-[var(--color-surface-card)] ring-[var(--color-text-primary)]' : 'hover:scale-105 opacity-85 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: swatchBg }}
                  title={item.name}
                >
                  {isSelected && (
                    <Check 
                      className={`w-4 h-4 stroke-[2.5] ${item.isMonochrome ? (isDark ? 'text-black' : 'text-white') : 'text-white'}`} 
                    />
                  )}
                </button>
              );
            })}

            {/* Custom Color Input */}
            <label 
              className="w-8 h-8 shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex items-center justify-center cursor-pointer tap-spring"
              title="Custom Hex"
            >
              <input
                type="color"
                value={accentColor || '#007AFF'}
                onChange={(e) => onSelectAccent(e.target.value)}
                className="opacity-0 absolute w-0 h-0"
              />
              <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">+</span>
            </label>
          </div>
        </div>

        {/* Section 4: Appearance (Smooth Sliding Pill Animation with Zero Clipping) */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-[var(--color-text-primary)] block">
              Appearance
            </span>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>

          <div className="relative flex p-1 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] w-[164px] select-none h-9 items-center overflow-hidden">
            {/* Sliding Active Pill Background with Bouncy Physical Spring */}
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

        {/* Section 5: Data Management & Student Templates */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] space-y-3 shadow-xs text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] block">
              Data & Backup
            </span>
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              JSON format
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                sfx.tap();
                onExport();
              }}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] flex items-center justify-center space-x-1.5 tap-spring"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sfx.tap();
                onImportClick();
              }}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] flex items-center justify-center space-x-1.5 tap-spring"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
            </button>
          </div>

          {/* Template & Reset Actions */}
          <div className="pt-2 border-t border-[var(--color-border-subtle)]">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  sfx.tap();
                  onDownloadTemplate();
                }}
                className="py-2.5 px-2.5 rounded-xl text-xs font-semibold bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] flex items-center justify-center space-x-1.5 tap-spring"
                title="Download JSON template to share with classmates"
              >
                <FileCode2 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span>Share Template</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sfx.tap();
                  if (confirm('Are you sure you want to wipe all records for a new semester?')) {
                    onWipeAllRecords();
                  }
                }}
                className="py-2.5 px-2.5 rounded-xl text-xs font-semibold bg-[var(--color-absent)]/10 text-[var(--color-absent-text)] hover:bg-[var(--color-absent)]/20 flex items-center justify-center space-x-1.5 tap-spring"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wipe All Data</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
