/**
 * Pure Web Audio procedural soundscape and UI haptic audio.
 * Zero external audio dependencies - completely offline and resilient.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientGain: GainNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private isAmbientPlaying: boolean = false;
  private ambientInterval: number | null = null;
  private chordIndex: number = 0;

  // Dreamy lofi / ambient chord frequencies (Hz)
  private chordProgression = [
    [220.00, 261.63, 329.63, 392.00], // Am7
    [174.61, 220.00, 261.63, 329.63], // Fmaj7
    [130.81, 164.81, 196.00, 246.94], // Cmaj7
    [196.00, 246.94, 293.66, 349.23], // G7
    [146.83, 174.61, 220.00, 261.63], // Dm7
    [164.81, 196.00, 246.94, 311.13], // Em7
  ];

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(muted ? 0 : 0.12, this.ctx.currentTime, 0.1);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsAmbientPlaying(): boolean {
    return this.isAmbientPlaying;
  }

  // Play a single UI interaction sound effect
  public playClick(pitchMultiplier: number = 1.0) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520 * pitchMultiplier, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(840 * pitchMultiplier, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  public playChime() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);

        gain.gain.setValueAtTime(0.035, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.06 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.46);
      });
    } catch {
      // Audio context might be restricted
    }
  }

  public playPop() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Ignore
    }
  }

  // Toggle ambient procedural music
  public toggleAmbient(): boolean {
    if (this.isAmbientPlaying) {
      this.stopAmbient();
      return false;
    } else {
      this.startAmbient();
      return true;
    }
  }

  public startAmbient() {
    const ctx = this.getContext();
    if (!ctx) return;

    this.isAmbientPlaying = true;

    if (!this.ambientGain) {
      this.ambientGain = ctx.createGain();
      this.ambientFilter = ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setValueAtTime(750, ctx.currentTime);
      this.ambientFilter.Q.setValueAtTime(2.5, ctx.currentTime);

      this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : 0.1, ctx.currentTime);
      this.ambientFilter.connect(this.ambientGain);
      this.ambientGain.connect(ctx.destination);
    }

    this.playNextAmbientChord();

    // Loop through chords smoothly every 4.2 seconds
    if (this.ambientInterval) clearInterval(this.ambientInterval);
    this.ambientInterval = window.setInterval(() => {
      if (this.isAmbientPlaying) {
        this.playNextAmbientChord();
      }
    }, 4200);
  }

  public stopAmbient() {
    this.isAmbientPlaying = false;
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    }
  }

  private playNextAmbientChord() {
    const ctx = this.getContext();
    if (!ctx || !this.ambientFilter) return;

    const chord = this.chordProgression[this.chordIndex];
    this.chordIndex = (this.chordIndex + 1) % this.chordProgression.length;

    // Filter subtle oscillation for organic breathing feel
    this.ambientFilter.frequency.setTargetAtTime(
      600 + Math.sin(Date.now() / 1500) * 350,
      ctx.currentTime,
      1.5
    );

    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      // Alternate waveforms for warm texture
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      // subtle detune for analog warmth
      osc.detune.setValueAtTime((Math.random() - 0.5) * 8, ctx.currentTime);

      const attack = 0.8 + i * 0.15;
      const duration = 4.0;
      const decay = 1.2;

      noteGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      noteGain.gain.linearRampToValueAtTime(0.025 / chord.length, ctx.currentTime + attack);
      noteGain.gain.setTargetAtTime(0.0001, ctx.currentTime + duration - decay, decay * 0.5);

      osc.connect(noteGain);
      noteGain.connect(this.ambientFilter!);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + 0.1);
    });
  }
}

export const sound = new SoundEngine();
