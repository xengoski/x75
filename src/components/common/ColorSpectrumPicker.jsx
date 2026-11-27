import React, { useState } from 'react';
import { Check, SlidersHorizontal } from 'lucide-react';
import { sfx } from '../../utils/audio';

// Curated modern accents
export const CURATED_ACCENTS = [
  { id: 'monochrome', name: 'Monochrome', color: '#FFFFFF', isMonochrome: true },
  { id: 'blue', name: 'Blue', color: '#007AFF' },
  { id: 'amber', name: 'Amber', color: '#F59E0B' },
  { id: 'emerald', name: 'Emerald', color: '#10B981' },
  { id: 'purple', name: 'Purple', color: '#8B5CF6' },
  { id: 'pink', name: 'Pink', color: '#EC4899' },
  { id: 'red', name: 'Red', color: '#EF4444' },
  { id: 'cyan', name: 'Cyan', color: '#06B6D4' },
  { id: 'orange', name: 'Orange', color: '#F97316' },
];

// Helper: HSL to Hex
export const hslToHex = (h, s, l) => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

export const ColorSpectrumPicker = ({ accentColor, onSelectAccent, isDark = true }) => {
  const [showSpectrum, setShowSpectrum] = useState(false);
  const [hue, setHue] = useState(210); // default blue hue

  const handleHueChange = (val) => {
    const h = parseInt(val, 10);
    setHue(h);
    const hex = hslToHex(h, 92, 54);
    onSelectAccent(hex);
  };

  return (
    <div className="space-y-3">
      {/* Header with Spectrum Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Accent Color
        </span>
        <button
          type="button"
          onClick={() => {
            sfx.tap();
            setShowSpectrum((prev) => !prev);
          }}
          className={`text-[11px] font-semibold tap-spring flex items-center space-x-1 transition-colors ${
            showSpectrum 
              ? 'text-[var(--color-primary)] font-bold' 
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>{showSpectrum ? 'Hide Slider' : 'Color Spectrum'}</span>
        </button>
      </div>

      {/* Curated Swatches Row */}
      <div className="flex items-center justify-between gap-1 sm:gap-1.5 flex-nowrap">
        {CURATED_ACCENTS.map((item) => {
          const isSelected = item.isMonochrome
            ? accentColor?.toLowerCase() === '#ffffff' || accentColor === 'monochrome'
            : (accentColor || '#007AFF').toLowerCase() === item.color.toLowerCase();

          const swatchBg = item.isMonochrome ? (isDark ? '#FFFFFF' : '#121316') : item.color;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                sfx.tap();
                onSelectAccent(item.color);
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full flex items-center justify-center tap-spring border border-[var(--color-border)] transition-transform ${
                isSelected
                  ? 'scale-110 ring-2 ring-offset-2 ring-offset-[var(--color-surface-card)] ring-[var(--color-text-primary)]'
                  : 'hover:scale-105 opacity-85 hover:opacity-100'
              }`}
              style={{ backgroundColor: swatchBg }}
              title={item.name}
            >
              {isSelected && (
                <Check
                  className={`w-3.5 h-3.5 stroke-[2.5] ${
                    item.isMonochrome ? (isDark ? 'text-black' : 'text-white') : 'text-white'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Visual Spectrum Hue Slider (Zero Hex Code Typing Needed!) */}
      {showSpectrum && (
        <div className="p-3 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-[var(--color-text-secondary)]">
              Slide to customize tint
            </span>
            <div className="flex items-center space-x-1.5">
              <span 
                className="w-4 h-4 rounded-full border border-white/20 shadow-xs inline-block"
                style={{ backgroundColor: accentColor || '#007AFF' }}
              />
              <span className="font-apple-num font-bold text-xs text-[var(--color-text-primary)]">
                {accentColor}
              </span>
            </div>
          </div>

          <div className="relative pt-1">
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={(e) => handleHueChange(e.target.value)}
              className="w-full h-3 rounded-full cursor-pointer appearance-none outline-none shadow-inner"
              style={{
                background:
                  'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
