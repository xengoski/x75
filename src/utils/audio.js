// Tactile Feedback Engine: Sound (Web Audio) + Haptics (Navigator.vibrate)

class FeedbackManager {
  constructor() {
    this.ctx = null;
    this.mode = 'sound'; // 'sound' | 'vibrate' | 'off'
  }

  setMode(mode) {
    this.mode = mode || 'sound';
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  haptic(pattern = 10) {
    if (this.mode === 'off') return;
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {}
  }

  tap() {
    if (this.mode === 'off') return;
    this.haptic(10);
    if (this.mode !== 'sound') return;

    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.025);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch {}
  }

  confirm() {
    if (this.mode === 'off') return;
    this.haptic([12, 40, 16]);
    if (this.mode !== 'sound') return;

    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  click() {
    this.tap();
  }

  present() {
    this.confirm();
  }

  absent() {
    this.tap();
  }

  // Backwards compatibility
  setEnabled(val) {
    this.mode = val ? 'sound' : 'off';
  }
}

export const sfx = new FeedbackManager();
