class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterVolume: number = 0.8;
  private enabled: boolean = true;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume / 100));
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume: number = 1): void {
    if (!this.enabled) return;

    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      const adjustedVolume = volume * this.masterVolume * 0.3;
      gainNode.gain.setValueAtTime(adjustedVolume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }
  }

  playKeypress(): void {
    this.playTone(800, 0.05, "sine", 0.3);
  }

  playError(): void {
    this.playTone(200, 0.15, "sawtooth", 0.4);
  }

  playWordComplete(): void {
    this.playTone(600, 0.08, "sine", 0.4);
    setTimeout(() => this.playTone(800, 0.08, "sine", 0.4), 50);
  }

  playCountdownBeep(): void {
    this.playTone(440, 0.2, "sine", 0.6);
  }

  playCountdownGo(): void {
    this.playTone(880, 0.3, "sine", 0.8);
  }

  playRaceStart(): void {
    const ctx = this.getContext();
    if (!this.enabled) return;

    try {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        setTimeout(() => {
          this.playTone(freq, 0.15, "sine", 0.5);
        }, i * 100);
      });
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }
  }

  playVictory(): void {
    if (!this.enabled) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, "sine", 0.5);
      }, i * 150);
    });
  }

  playFinish(): void {
    if (!this.enabled) return;

    this.playTone(440, 0.15, "sine", 0.5);
    setTimeout(() => this.playTone(550, 0.15, "sine", 0.5), 100);
  }

  playEngineHum(duration: number = 0.5): void {
    if (!this.enabled) return;

    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      lfo.frequency.setValueAtTime(5, ctx.currentTime);
      lfoGain.gain.setValueAtTime(20, ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(oscillator.frequency);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(80, ctx.currentTime);

      const volume = 0.1 * this.masterVolume;
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      lfo.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
      lfo.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }
  }

  playBoost(): void {
    if (!this.enabled) return;

    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(100, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);

      const volume = 0.2 * this.masterVolume;
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }
  }

  resumeContext(): void {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }
}

export const soundManager = new SoundManager();
