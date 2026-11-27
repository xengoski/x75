import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, Check, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { sfx } from '../utils/audio';

export const StudentInitialSetup = ({ students = [], onComplete, accentColor = '#007AFF' }) => {
  // Step 1: 'select' | Step 2: 'verify'
  const [step, setStep] = useState('select');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [passkeyInput, setPasskeyInput] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isErrorShaking, setIsErrorShaking] = useState(false);

  // Search filter (searches by name only, zero roll numbers exposed in UI)
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => s.name.toLowerCase().includes(q));
  }, [students, searchQuery]);

  const handleSelectStudent = (stu) => {
    sfx.tap();
    setSelectedStudent(stu);
    setPasskeyInput('');
    setErrorMsg('');
    setStep('verify');
  };

  const handleVerify = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');

    // Sanitize input to prevent injection
    const sanitizedPin = (passkeyInput || '').trim().replace(/[^0-9a-zA-Z]/g, '');

    if (!selectedStudent) return;

    if (sanitizedPin === selectedStudent.enrollNo) {
      sfx.confirm();
      localStorage.setItem('X75_STUDENT_SETUP_DONE', 'true');
      onComplete(selectedStudent.enrollNo);
    } else {
      sfx.absent();
      setIsErrorShaking(true);
      setErrorMsg(`Incorrect pin for ${selectedStudent.name}`);
      setTimeout(() => setIsErrorShaking(false), 500);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 select-none overflow-hidden bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      
      {/* Top Header */}
      <div className="pt-[max(2.75rem,env(safe-area-inset-top,0px))] sm:pt-4 pb-2 flex items-center justify-between shrink-0">
        <span className="font-display font-extrabold text-lg tracking-tight lowercase">
          x<span style={{ color: accentColor }}>75</span>
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/70">
          Initial Setup
        </span>
      </div>

      {/* STEP 1: SELECT YOUR NAME */}
      {step === 'select' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden space-y-3.5 animate-in fade-in duration-200">
          <div className="space-y-1">
            <span className="text-base font-bold text-[var(--color-text-primary)] block">
              Select Your Profile
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              Choose your name to setup this device
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search your name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Students List (Names Only) */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredStudents.map(stu => (
              <button
                key={stu.enrollNo}
                type="button"
                onClick={() => handleSelectStudent(stu)}
                className="w-full p-3 rounded-xl bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-left flex items-center justify-between tap-spring transition-colors"
              >
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                    {stu.name}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">
                    Mechatronics A
                  </span>
                </div>
                <ChevronLeft className="w-4 h-4 rotate-180 text-[var(--color-text-tertiary)]" />
              </button>
            ))}
          </div>

          <div className="pt-2 text-center text-[11px] text-[var(--color-text-tertiary)]">
            {students.length} students enrolled in Mechatronics A
          </div>
        </div>
      )}

      {/* STEP 2: VERIFY PASSKEY PIN */}
      {step === 'verify' && selectedStudent && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
          
          <div className="space-y-4 pt-2">
            <button
              type="button"
              onClick={() => {
                sfx.tap();
                setStep('select');
              }}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] tap-spring"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Change Profile</span>
            </button>

            <div className="p-4 rounded-2xl bg-[var(--color-surface-card)] border border-[var(--color-border)] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--color-primary)] tracking-wider block">
                Selected Student
              </span>
              <span className="text-sm font-bold text-[var(--color-text-primary)] block">
                {selectedStudent.name}
              </span>
              <span className="text-[11px] text-[var(--color-text-secondary)]">
                Mechatronics A (Batch 2026-2030)
              </span>
            </div>

            <form onSubmit={handleVerify} className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-primary)] block">
                  Verify Passkey
                </label>
                <span className="text-[11px] text-[var(--color-text-secondary)] block">
                  Enter your 6-digit roll number as your 1-time verification pin
                </span>
              </div>

              <div className="relative">
                <input
                  type={showPasskey ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={passkeyInput}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9a-zA-Z]/g, '');
                    setPasskeyInput(clean);
                    setErrorMsg('');
                  }}
                  autoFocus
                  className={`w-full py-3 px-4 pr-10 rounded-xl bg-[var(--color-surface-secondary)] border text-center font-apple-num font-bold text-lg tracking-widest text-[var(--color-text-primary)] outline-none transition-colors ${
                    isErrorShaking ? 'border-red-500 animate-shake' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasskey(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] tap-spring"
                >
                  {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold text-center animate-in fade-in">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={passkeyInput.length < 6}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-[var(--color-primary)] text-white shadow-md tap-spring disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify & Get Started</span>
              </button>
            </form>
          </div>

          <div className="text-center text-[10px] text-[var(--color-text-tertiary)] pb-2">
            One-time verification. You won't need to re-enter this unless you switch user.
          </div>
        </div>
      )}

    </div>
  );
};
