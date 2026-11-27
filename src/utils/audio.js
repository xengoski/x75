// Tactile Feedback Engine: Sound (Web Audio) + Native Haptics (@capacitor/haptics + Navigator.vibrate)
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

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

  async haptic(intensity = 'light') {
    if (this.mode === 'off') return;
    try {
      if (intensity === 'light' || intensity === 10) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (intensity === 'medium') {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (intensity === 'heavy') {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (intensity === 'success') {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (intensity === 'warning') {
        await Haptics.notification({ type: NotificationType.Warning });
      } else if (Array.isArray(intensity)) {
        await Haptics.vibrate({ duration: intensity[0] || 25 });
      } else {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch {
      // Fallback to Web API navigator.vibrate
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(Array.isArray(intensity) ? intensity : typeof intensity === 'number' ? intensity : 15);
        }
      } catch {}
    }
  }

  tap() {
    if (this.mode === 'off') return;
    this.haptic('light');
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
    this.haptic('medium');
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
