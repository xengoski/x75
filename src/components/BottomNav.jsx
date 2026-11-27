import React from 'react';
import { Gauge, Calendar, Sliders } from 'lucide-react';
import { sfx } from '../utils/audio';

export const BottomNav = ({ activeTab, setActiveTab, accentColor }) => {
  const TABS = [
    { id: 'status', label: 'Status', icon: Gauge },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'config', label: 'Settings', icon: Sliders }
  ];

  const activeIndex = Math.max(0, TABS.findIndex(t => t.id === activeTab));

  return (
    <div className="w-full px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-5 pt-1 select-none flex justify-center pointer-events-none shrink-0 z-30">
      {/* Modern iOS 18 / M3 Expressive Floating Dock Capsule */}
      <nav className="w-full max-w-[320px] rounded-full border border-[var(--color-border)] bg-[var(--color-surface-card)]/95 backdrop-blur-lg shadow-xl shadow-black/30 grid grid-cols-3 p-1 pointer-events-auto transition-all relative overflow-hidden">
        
        {/* Sliding Active Pill Indicator (No Corner Clipping) */}
        <div 
          className="absolute top-1 bottom-1 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.25,0.64,1)] pointer-events-none"
          style={{
            left: '4px',
            width: 'calc((100% - 8px) / 3)',
            backgroundColor: `${accentColor || '#007AFF'}18`,
            transform: `translateX(${activeIndex * 100}%)`
          }}
        />

        {TABS.map((t) => {
          const isActive = activeTab === t.id;
          const Icon = t.icon;

          return (
            <button
              key={t.id}
              onClick={() => {
                sfx.tap();
                setActiveTab(t.id);
              }}
              className="relative z-10 py-1.5 flex flex-col items-center justify-center space-y-0.5 tap-spring rounded-full"
            >
              <Icon 
                className={`w-4 h-4 transition-transform duration-300 stroke-[2.2] ${
                  isActive ? 'scale-110' : 'scale-95 opacity-50 hover:opacity-80'
                }`} 
                style={{ color: isActive ? (accentColor || '#007AFF') : 'var(--color-text-secondary)' }} 
              />
              
              <span 
                className={`text-[10px] tracking-tight transition-colors duration-200 ${
                  isActive ? 'font-bold' : 'font-medium opacity-50'
                }`}
                style={{ color: isActive ? (accentColor || '#007AFF') : 'var(--color-text-secondary)' }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
