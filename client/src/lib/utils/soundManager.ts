/*
  Advanced SoundManager using Web Audio API
  - Programmatic synthesis for effects and music
  - Global volume (0-100), mute toggle
  - Fade in/out helpers
  - Simple node pooling (Gain, StereoPanner, Panner3D)
  - Spatial audio (stereo and 3D)
  - Optional Howler.js integration via dynamic import (no external assets)
*/

type SpatialOptions = {
  // -1 (left) to 1 (right) for stereo, or use position for 3D
  pan?: number;
  position3D?: { x: number; y: number; z: number };
};

type PlayOptions = {
  type?: OscillatorType;
  frequency?: number;
  duration?: number; // seconds
  volume?: number; // 0..1 pre-master
  fadeIn?: number; // seconds
  fadeOut?: number; // seconds
  spatial?: SpatialOptions;
};

class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private stereoPanner: StereoPannerNode | null = null; // shared for simple stereo
  private nodePool = {
    gain: [] as GainNode[],
    stereo: [] as StereoPannerNode[],
    panner3d: [] as PannerNode[],
  };
  private ambientNodes: { stop: () => void } | null = null;
  private howler: any | null = null;
  private masterVolume: number = 0.8; // 0..1
  private enabled: boolean = true; // mute toggle

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      // master chain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.setValueAtTime(this.enabled ? this.masterVolume : 0, this.audioContext.currentTime);
      // optional shared stereo panner
      if (this.audioContext.createStereoPanner) {
        this.stereoPanner = this.audioContext.createStereoPanner();
        this.masterGain.connect(this.stereoPanner);
        this.stereoPanner.connect(this.audioContext.destination);
      } else {
        this.masterGain.connect(this.audioContext.destination);
      }
    }
    return this.audioContext;
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume / 100));
    const ctx = this.audioContext;
    if (ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.enabled ? this.masterVolume : 0, ctx.currentTime, 0.01);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    const ctx = this.getContext();
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(enabled ? this.masterVolume : 0, ctx.currentTime, 0.015);
    }
  }

  private acquireGain(): GainNode {
    const ctx = this.getContext();
    const n = this.nodePool.gain.pop();
    return n ?? ctx.createGain();
  }
  private releaseGain(node: GainNode) {
    try { node.disconnect(); } catch {}
    this.nodePool.gain.push(node);
  }
  private acquireStereo(): StereoPannerNode | null {
    const ctx = this.getContext();
    if (!ctx.createStereoPanner) return null;
    const n = this.nodePool.stereo.pop();
    return n ?? ctx.createStereoPanner();
  }
  private releaseStereo(node: StereoPannerNode | null) {
    if (!node) return;
    try { node.disconnect(); } catch {}
    this.nodePool.stereo.push(node);
  }
  private acquirePanner3D(): PannerNode {
    const ctx = this.getContext();
    const n = this.nodePool.panner3d.pop();
    return n ?? ctx.createPanner();
  }
  private releasePanner3D(node: PannerNode) {
    try { node.disconnect(); } catch {}
    this.nodePool.panner3d.push(node);
  }

  private applySpatial(chainEnd: AudioNode, spatial?: SpatialOptions): AudioNode {
    const ctx = this.getContext();
    if (!spatial) return chainEnd;
    // Prefer simple stereo if pan provided
    if (typeof spatial.pan === 'number' && this.stereoPanner) {
      const p = this.acquireStereo();
      if (p) {
        p.pan.setValueAtTime(Math.max(-1, Math.min(1, spatial.pan)), ctx.currentTime);
        chainEnd.connect(p);
        return p;
      }
    }
    if (spatial.position3D) {
      const p3 = this.acquirePanner3D();
      p3.panningModel = 'HRTF';
      p3.setPosition(spatial.position3D.x, spatial.position3D.y, spatial.position3D.z);
      chainEnd.connect(p3);
      return p3;
    }
    return chainEnd;
  }

  private scheduleFade(gain: GainNode, startTime: number, duration: number, to: number) {
    gain.gain.cancelScheduledValues(startTime);
    if (duration <= 0) {
      gain.gain.setValueAtTime(to, startTime);
    } else {
      gain.gain.setValueAtTime(gain.gain.value, startTime);
      gain.gain.linearRampToValueAtTime(to, startTime + duration);
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume: number = 1, options: Partial<PlayOptions> = {}): void {
    if (!this.enabled) return;

    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const g = this.acquireGain();
      const fadeIn = options.fadeIn ?? 0.0;
      const fadeOut = options.fadeOut ?? Math.min(0.05, duration * 0.5);

      osc.type = options.type ?? type;
      osc.frequency.setValueAtTime(options.frequency ?? frequency, ctx.currentTime);

      const adjustedVolume = (options.volume ?? volume) * this.masterVolume;
      g.gain.setValueAtTime(0, ctx.currentTime);

      let endNode: AudioNode = g;
      endNode = this.applySpatial(g, options.spatial);

      // Connect chain to master
      if (endNode !== g) {
        endNode.connect(this.masterGain!);
      } else {
        g.connect(this.masterGain!);
      }

      // Fades
      this.scheduleFade(g, ctx.currentTime, fadeIn, adjustedVolume);
      this.scheduleFade(g, ctx.currentTime + Math.max(0, duration - fadeOut), fadeOut, 0.0001);

      osc.connect(g);
      osc.start();
      osc.stop(ctx.currentTime + duration);

      osc.onended = () => {
        try { osc.disconnect(); } catch {}
        this.releaseGain(g);
        // release spatial nodes
        if (endNode instanceof StereoPannerNode) this.releaseStereo(endNode as StereoPannerNode);
        if (endNode instanceof PannerNode) this.releasePanner3D(endNode as PannerNode);
      };
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }
  }

  // Basic SFX wrappers
  playKeypress(spatial?: SpatialOptions): void {
    // Slight pitch variation for more natural feel
    const base = 1800;
    const jitter = (Math.random() - 0.5) * 200; // +/- 100 Hz
    this.playTone(base + jitter, 0.025, "triangle", 0.32, { fadeOut: 0.02, spatial });
  }

  playBackspace(spatial?: SpatialOptions): void {
    // Soft, lower-pitched tap with tiny downward sweep
    const ctx = this.getContext();
    if (!this.enabled) return;
    try {
      const osc = ctx.createOscillator();
      const g = this.acquireGain();
      const endNode = this.applySpatial(g, spatial);
      endNode.connect(this.masterGain!);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.05);

      const v = 0.28 * this.masterVolume;
      g.gain.setValueAtTime(v, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(g);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
      osc.onended = () => {
        try { osc.disconnect(); } catch {}
        this.releaseGain(g);
        if (endNode instanceof StereoPannerNode) this.releaseStereo(endNode as StereoPannerNode);
        if (endNode instanceof PannerNode) this.releasePanner3D(endNode as PannerNode);
      };
    } catch (e) {
      console.warn("Backspace sound failed", e);
    }
  }

  playError(spatial?: SpatialOptions): void {
    // Dissonant buzz: two close saw waves through slight detune
    this.playTone(130, 0.18, "sawtooth", 0.35, { spatial });
    this.playTone(137, 0.18, "sawtooth", 0.25, { spatial });
  }

  playWordComplete(spatial?: SpatialOptions): void {
    this.playTone(600, 0.08, "sine", 0.35, { spatial });
    setTimeout(() => this.playTone(800, 0.08, "sine", 0.35, { spatial }), 50);
  }

  playCountdownBeep(spatial?: SpatialOptions): void {
    this.playTone(440, 0.18, "sine", 0.55, { fadeIn: 0.005, fadeOut: 0.06, spatial });
  }

  playCountdownGo(spatial?: SpatialOptions): void {
    this.playTone(1046.5, 0.25, "sine", 0.7, { fadeIn: 0.01, fadeOut: 0.08, spatial });
  }

  playRaceStart(spatial?: SpatialOptions): void {
    const ctx = this.getContext();
    if (!this.enabled) return;

    try {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        setTimeout(() => {
          this.playTone(freq, 0.12, "sine", 0.45, { spatial });
        }, i * 100);
      });
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }
  }

  playVictory(spatial?: SpatialOptions): void {
    if (!this.enabled) return;

    // Simple fanfare using triads: C major -> F major -> G major -> C
    const chords: number[][] = [
      [523.25, 659.25, 783.99], // C-E-G
      [349.23, 440.00, 587.33], // F-A-D
      [392.00, 493.88, 659.25], // G-B-E
      [523.25, 659.25, 783.99], // C-E-G
    ];
    chords.forEach((triad, i) => {
      setTimeout(() => {
        triad.forEach((f, j) => this.playTone(f, 0.28, j === 0 ? "square" : "sine", 0.38, { spatial }));
      }, i * 260);
    });
  }

  playFinish(spatial?: SpatialOptions): void {
    if (!this.enabled) return;

    this.playTone(440, 0.14, "sine", 0.45, { spatial });
    setTimeout(() => this.playTone(550, 0.14, "sine", 0.45, { spatial }), 100);
  }

  playEngineHum(duration: number = 0.5, spatial?: SpatialOptions): void {
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
      {
        const endNode = this.applySpatial(gainNode, spatial);
        endNode.connect(this.masterGain!);
      }

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

  playBoost(spatial?: SpatialOptions): void {
    if (!this.enabled) return;

    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      {
        const endNode = this.applySpatial(gainNode, spatial);
        endNode.connect(this.masterGain!);
      }

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

  // Power-up pickup: ascending arpeggio
  playPowerUp(spatial?: SpatialOptions): void {
    const steps = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    steps.forEach((f, i) => setTimeout(() => this.playTone(f, 0.08, i % 2 ? 'triangle' : 'sine', 0.4, { fadeIn: 0.01, fadeOut: 0.04, spatial }), i * 70));
  }

  // Countdown: 3 short beeps then a longer high "GO"
  playCountdownSequence(spatial?: SpatialOptions): void {
    [0, 1, 2].forEach((i) => setTimeout(() => this.playCountdownBeep(spatial), i * 600));
    setTimeout(() => this.playCountdownGo(spatial), 3 * 600);
  }

  // Background ambient: gentle pad with slow LFO and lowpass filter
  startAmbientMusic(): void {
    if (!this.enabled || this.ambientNodes) return;
    try {
      const ctx = this.getContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = this.acquireGain();
      const filter = ctx.createBiquadFilter();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc1.type = 'sine'; osc2.type = 'triangle';
      osc1.frequency.value = 261.63; // C4
      osc2.frequency.value = 329.63; // E4

      filter.type = 'lowpass';
      filter.frequency.value = 1200;

      lfo.frequency.value = 0.1; // slow movement
      lfoGain.gain.value = 0.25; // subtle tremolo

      // routing: (osc mix) -> gain -> filter -> master
      osc1.connect(gain); osc2.connect(gain);
      gain.connect(filter);
      filter.connect(this.masterGain!);

      // LFO to gain for slow tremolo
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      // set base volume and slowly fade in
      const base = 0.12 * this.masterVolume;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      this.scheduleFade(gain, ctx.currentTime, 2.0, base);

      osc1.start(); osc2.start(); lfo.start();

      this.ambientNodes = {
        stop: () => {
          const t = ctx.currentTime;
          this.scheduleFade(gain, t, 1.0, 0.0001);
          setTimeout(() => {
            try { osc1.stop(); osc2.stop(); lfo.stop(); } catch {}
            try { osc1.disconnect(); osc2.disconnect(); lfo.disconnect(); filter.disconnect(); } catch {}
            this.releaseGain(gain);
            this.ambientNodes = null;
          }, 1100);
        }
      };
    } catch (e) {
      console.warn('Ambient start failed', e);
    }
  }

  stopAmbientMusic(): void {
    if (this.ambientNodes) this.ambientNodes.stop();
  }

  resumeContext(): void {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }

 // Optional Howler.js integration with synthesized sprite sheet
 async buildHowlerSprite() {
   // Only use global Howler if it already exists; avoid bundler resolution.
   try {
     const HowlCtor: any = (window as any).Howl;
     if (!HowlCtor) {
       console.warn('Howler not found on window. Skipping sprite build.');
       return null;
     }
     // Build simple sprites using generated PCM -> WAV data URI
     const { dataUrl, sprites } = this.generateSpriteWav();
     const howl = new HowlCtor({ src: [dataUrl], sprite: sprites, volume: this.masterVolume });
     this.howler = howl;
     return howl;
   } catch (e) {
     console.warn('Howler integration unavailable:', e);
     return null;
   }
 }

 private generateSpriteWav(): { dataUrl: string; sprites: Record<string, [number, number]> } {
   // Synthesize small clips and lay them out back-to-back
   const sampleRate = 44100;
   const clips: { key: string; samples: Float32Array }[] = [];
   const tone = (freq: number, dur: number, type: OscillatorType = 'sine', amp = 0.4) => this.renderToneSamples(sampleRate, dur, freq, type, amp);

   clips.push({ key: 'keypress', samples: tone(2400, 0.08, 'sine', 0.5) });
   // error as two stacked tones
   clips.push({ key: 'error', samples: this.mixSamples(sampleRate, [tone(130, 0.2, 'sawtooth', 0.35), tone(137, 0.2, 'sawtooth', 0.25)]) });
   // powerup arpeggio
   const p1 = tone(523.25, 0.09, 'sine', 0.4);
   const p2 = tone(659.25, 0.09, 'triangle', 0.35);
   const p3 = tone(783.99, 0.09, 'sine', 0.35);
   const p4 = tone(1046.5, 0.12, 'triangle', 0.35);
   clips.push({ key: 'powerup', samples: this.concatSamples([p1, this.silence(sampleRate, 0.03), p2, this.silence(sampleRate, 0.03), p3, this.silence(sampleRate, 0.03), p4]) });
   // countdown
   clips.push({ key: 'beep', samples: tone(440, 0.2, 'sine', 0.6) });
   clips.push({ key: 'go', samples: tone(1046.5, 0.25, 'sine', 0.7) });

   // Lay out with small gaps
   const gap = this.silence(sampleRate, 0.05);
   const sprites: Record<string, [number, number]> = {};
   let offset = 0;
   const all: Float32Array[] = [];
   for (const c of clips) {
     sprites[c.key] = [Math.round((offset / sampleRate) * 1000), Math.round((c.samples.length / sampleRate) * 1000)];
     all.push(c.samples, gap);
     offset += c.samples.length + gap.length;
   }
   const merged = this.concatSamples(all);
   const wav = this.encodeWav(merged, sampleRate);
   const b64 = this.toBase64(wav);
   const dataUrl = `data:audio/wav;base64,${b64}`;
   return { dataUrl, sprites };
 }

 private renderToneSamples(sampleRate: number, duration: number, frequency: number, type: OscillatorType, amp: number): Float32Array {
   const total = Math.floor(sampleRate * duration);
   const out = new Float32Array(total);
   for (let i = 0; i < total; i++) {
     const t = i / sampleRate;
     const phi = 2 * Math.PI * frequency * t;
     let s = 0;
     switch (type) {
       case 'square': s = Math.sign(Math.sin(phi)); break;
       case 'sawtooth': s = 2 * (t * frequency - Math.floor(0.5 + t * frequency)); break;
       case 'triangle': s = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1; break;
       default: s = Math.sin(phi);
     }
     // very short fade to avoid clicks
     const fade = Math.min(1, i / (sampleRate * 0.01)) * Math.min(1, (total - i) / (sampleRate * 0.02));
     out[i] = s * amp * fade;
   }
   return out;
 }

 private concatSamples(arrays: Float32Array[]): Float32Array {
   const len = arrays.reduce((n, a) => n + a.length, 0);
   const out = new Float32Array(len);
   let off = 0;
   for (const a of arrays) { out.set(a, off); off += a.length; }
   return out;
 }
 private silence(sampleRate: number, duration: number): Float32Array { return new Float32Array(Math.floor(sampleRate * duration)); }
 private mixSamples(sampleRate: number, arrays: Float32Array[]): Float32Array {
   const len = Math.max(...arrays.map(a => a.length));
   const out = new Float32Array(len);
   for (let i = 0; i < len; i++) {
     let s = 0;
     for (const a of arrays) s += (a[i] || 0);
     out[i] = Math.max(-1, Math.min(1, s));
   }
   return out;
 }
 private encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
   const bytesPerSample = 2;
   const blockAlign = bytesPerSample * 1;
   const byteRate = sampleRate * blockAlign;
   const dataSize = samples.length * bytesPerSample;
   const buffer = new ArrayBuffer(44 + dataSize);
   const view = new DataView(buffer);
   let p = 0;
   const writeStr = (s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(p++, s.charCodeAt(i)); };
   const writeU32 = (v: number) => { view.setUint32(p, v, true); p += 4; };
   const writeU16 = (v: number) => { view.setUint16(p, v, true); p += 2; };
   writeStr('RIFF'); writeU32(36 + dataSize); writeStr('WAVE');
   writeStr('fmt '); writeU32(16); writeU16(1); writeU16(1); writeU32(sampleRate); writeU32(byteRate); writeU16(blockAlign); writeU16(16);
   writeStr('data'); writeU32(dataSize);
   const out = new Uint8Array(buffer);
   // PCM
   let offset = 44;
   for (let i = 0; i < samples.length; i++) {
     let s = Math.max(-1, Math.min(1, samples[i]));
     s = s < 0 ? s * 0x8000 : s * 0x7FFF;
     out[offset++] = s & 0xFF;
     out[offset++] = (s >> 8) & 0xFF;
   }
   return out;
 }
 private toBase64(bytes: Uint8Array): string {
   let binary = '';
   const chunk = 0x8000;
   for (let i = 0; i < bytes.length; i += chunk) {
     binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
   }
   return btoa(binary);
 }
}

export const soundManager = new SoundManager();
