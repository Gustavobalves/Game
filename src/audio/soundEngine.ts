/**
 * Web Audio API procedural sound engine for realistic car racing audio.
 * Synthesizes engine RPM, turbo spool & blow-off valve, tire skid screech, nitro boost, and UI effects.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  // Engine sound nodes
  private engineGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineSubGain: GainNode | null = null;

  // Tire skid nodes
  private skidGain: GainNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;
  private skidNoiseNode: AudioBufferSourceNode | null = null;

  // Turbo whistle
  private turboGain: GainNode | null = null;
  private turboOsc: OscillatorNode | null = null;

  // Nitro sound
  private nitroGain: GainNode | null = null;
  private nitroNoiseNode: AudioBufferSourceNode | null = null;

  private isRunning: boolean = false;
  private lastThrottle: number = 0;

  constructor() {
    // Initialized on first user interaction
  }

  public init() {
    if (this.ctx) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngine();
      this.setupSkid();
      this.setupTurbo();
      this.setupNitro();
      this.isRunning = true;
    } catch {
      // Audio not supported or blocked
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createNoiseBuffer(durationSeconds = 2): AudioBuffer {
    if (!this.ctx) throw new Error('No context');
    const bufferSize = this.ctx.sampleRate * durationSeconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private setupEngine() {
    if (!this.ctx || !this.masterGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    // Primary fundamental tone
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    // Harmonic engine tone
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

    // Sub-bass rumble
    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'sawtooth';
    this.engineSubOsc.frequency.setValueAtTime(22.5, this.ctx.currentTime);

    this.engineSubGain = this.ctx.createGain();
    this.engineSubGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineSubOsc.connect(this.engineSubGain);
    this.engineSubGain.connect(this.engineFilter);

    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineSubOsc.start();
  }

  private setupSkid() {
    if (!this.ctx || !this.masterGain) return;

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
    this.skidFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    const noiseBuffer = this.createNoiseBuffer(3);
    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    source.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.masterGain);
    source.start();
    this.skidNoiseNode = source;
  }

  private setupTurbo() {
    if (!this.ctx || !this.masterGain) return;

    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.setValueAtTime(1400, this.ctx.currentTime);

    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.masterGain);
    this.turboOsc.start();
  }

  private setupNitro() {
    if (!this.ctx || !this.masterGain) return;

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    const noiseBuffer = this.createNoiseBuffer(2);
    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    source.connect(filter);
    filter.connect(this.nitroGain);
    this.nitroGain.connect(this.masterGain);
    source.start();
    this.nitroNoiseNode = source;
  }

  /**
   * Updates dynamic vehicular sound properties each physics frame
   */
  public updateCarSound(
    rpm: number,
    throttle: number,
    skidIntensity: number, // 0 to 1
    isNitro: boolean,
    speedKmh: number
  ) {
    if (!this.ctx || !this.isRunning || this.isMuted) return;

    const t = Number.isFinite(this.ctx.currentTime) ? this.ctx.currentTime : 0;
    const safeRpm = Number.isFinite(rpm) ? rpm : 1000;
    const clampedRpm = Math.max(800, Math.min(8800, safeRpm));
    const rpmNorm = (clampedRpm - 800) / 8000;

    const safeThrottle = Number.isFinite(throttle) ? Math.max(0, Math.min(1, throttle)) : 0;
    const safeSkid = Number.isFinite(skidIntensity) ? Math.max(0, Math.min(1, skidIntensity)) : 0;
    const safeSpeed = Number.isFinite(speedKmh) ? Math.max(0, speedKmh) : 0;

    // Pitch: 800 rpm = ~35Hz, 8000 rpm = ~260Hz
    const baseFreq = Math.max(20, Math.min(1000, 32 + rpmNorm * 220));

    if (this.engineOsc1 && this.engineOsc2 && this.engineSubOsc) {
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.04);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.01, t, 0.04);
      this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.04);
    }

    if (this.engineFilter) {
      // Open up filter on heavy throttle and high RPM
      const filterCutoff = Math.max(100, Math.min(8000, 350 + rpmNorm * 3200 + (safeThrottle > 0 ? 800 : 0)));
      this.engineFilter.frequency.setTargetAtTime(filterCutoff, t, 0.05);
    }

    if (this.engineGain) {
      const vol = Math.max(0, Math.min(0.8, 0.15 + (safeThrottle > 0 ? 0.22 : 0.08) + rpmNorm * 0.18));
      this.engineGain.gain.setTargetAtTime(vol, t, 0.05);
    }

    // Turbo spool on high throttle + blow-off valve flutter on throttle drop
    if (this.turboGain && this.turboOsc) {
      if (safeThrottle > 0.4 && safeSpeed > 20) {
        const turboPitch = Math.max(500, Math.min(4000, 900 + rpmNorm * 1800));
        this.turboOsc.frequency.setTargetAtTime(turboPitch, t, 0.08);
        const turboVol = Math.max(0, Math.min(0.2, 0.04 + rpmNorm * 0.08));
        this.turboGain.gain.setTargetAtTime(turboVol, t, 0.08);
      } else {
        // Did player release throttle quickly? Blow-off flutter
        if (this.lastThrottle > 0.7 && safeThrottle < 0.2 && safeSpeed > 50) {
          this.triggerBlowOffValve();
        }
        this.turboGain.gain.setTargetAtTime(0, t, 0.04);
      }
    }

    // Skid screech
    if (this.skidGain && this.skidFilter) {
      const targetSkidVol = Math.max(0, Math.min(0.45, safeSkid * 0.42));
      this.skidGain.gain.setTargetAtTime(targetSkidVol, t, 0.04);
      if (safeSkid > 0.05) {
        const skidFreq = Math.max(300, Math.min(3000, 900 + safeSkid * 800));
        this.skidFilter.frequency.setTargetAtTime(skidFreq, t, 0.06);
      }
    }

    // Nitro whoosh
    if (this.nitroGain) {
      const nitroVol = isNitro ? 0.35 : 0;
      this.nitroGain.gain.setTargetAtTime(nitroVol, t, 0.05);
    }

    this.lastThrottle = safeThrottle;
  }

  public triggerBlowOffValve() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    // Quick burst of high-passed noise for "Pshhhhh!"
    const blowGain = this.ctx.createGain();
    blowGain.gain.setValueAtTime(0.25, t);
    blowGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    const blowFilter = this.ctx.createBiquadFilter();
    blowFilter.type = 'highpass';
    blowFilter.frequency.setValueAtTime(2200, t);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.5);
    noise.connect(blowFilter);
    blowFilter.connect(blowGain);
    if (this.masterGain) blowGain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.35);
  }

  public triggerShiftPop() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playCashEarnedSound() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    [880, 1108.73, 1318.51, 1760].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);

      gain.gain.setValueAtTime(0.15, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.2);

      osc.connect(gain);
      if (this.masterGain) gain.connect(this.masterGain);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.2);
    });
  }

  public playCountdownBeep(isFinal = false) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinal ? 880 : 440, t);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isFinal ? 0.45 : 0.25));

    osc.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + (isFinal ? 0.45 : 0.25));
  }

  public playCheckpointSound() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(659.25, t); // E5
    osc.frequency.exponentialRampToValueAtTime(987.77, t + 0.15); // B5
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public stopEngine() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    if (this.skidGain && this.ctx) {
      this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }
}

export const soundEngine = new SoundEngine();
