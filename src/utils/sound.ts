class CozySoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration = 0.08,
    type: OscillatorType = 'sine',
    volume = 0.06,
    delay = 0,
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  tap() {
    this.playTone(520, 0.06, 'triangle', 0.045);
  }

  step() {
    this.playTone(340, 0.04, 'sine', 0.025);
  }

  enterDoor() {
    this.playTone(440, 0.09, 'triangle', 0.05, 0);
    this.playTone(587.33, 0.12, 'triangle', 0.05, 0.06);
  }

  sparkle() {
    this.playTone(659.25, 0.08, 'sine', 0.05, 0);
    this.playTone(880, 0.12, 'sine', 0.05, 0.06);
    this.playTone(1046.5, 0.15, 'sine', 0.045, 0.12);
  }

  splash() {
    this.playTone(392, 0.08, 'sine', 0.05, 0);
    this.playTone(523.25, 0.14, 'sine', 0.04, 0.05);
  }

  nap() {
    this.playTone(392, 0.18, 'sine', 0.04, 0);
    this.playTone(329.63, 0.24, 'sine', 0.04, 0.14);
  }
}

export const soundFX = new CozySoundEngine();
