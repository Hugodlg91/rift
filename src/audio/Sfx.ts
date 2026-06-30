/**
 * Procedural sound effects via the Web Audio API — zero audio files. Every SFX
 * is synthesised on demand from oscillators / noise + envelopes + filters, all
 * routed through a master GainNode (so `toggleMute` silences everything).
 *
 * The AudioContext starts suspended (browser autoplay policy); call `resume()`
 * from a user gesture (first key / click) before sound will play.
 */

interface BlipOpts {
  type: OscillatorType;
  freq: number;
  freqEnd?: number;
  duration: number;
  gain: number;
  attack?: number;
  delay?: number;
  filter?: { type: BiquadFilterType; freq: number; q?: number };
}

interface NoiseOpts {
  duration: number;
  gain: number;
  filterType: BiquadFilterType;
  freq: number;
  freqEnd?: number;
  q?: number;
  delay?: number;
}

export default class Sfx {
  private readonly ctx: AudioContext;
  private readonly masterGain: GainNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly level = 0.35;
  // Mute lives on the singleton (this whole module is one instance), so it
  // persists across scene changes — never stored in a scene.
  private muted = false;

  constructor() {
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.level;

    // Soft limiter before the destination — catches peaks when SFX stack.
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -10;
    this.compressor.knee.value = 20;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.2;

    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    // Unlock on the first user gesture anywhere (mouse OR key), so audio also
    // resumes on a dev refresh straight into the game, not just from the menu.
    const unlock = (): void => {
      this.resume();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  /** Shared context + master bus, so Ambience can route through the same mute. */
  get context(): AudioContext {
    return this.ctx;
  }
  get master(): GainNode {
    return this.masterGain;
  }
  get isMuted(): boolean {
    return this.muted;
  }

  /** Resume the context — must be called from a user gesture. */
  resume(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    const t = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(t);
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.level, t, 0.02);
    return this.muted;
  }

  // --- wired SFX -----------------------------------------------------------

  jump(): void {
    this.blip({ type: 'triangle', freq: 300, freqEnd: 560, duration: 0.12, gain: 0.22 });
  }

  doubleJump(): void {
    this.blip({ type: 'triangle', freq: 440, freqEnd: 820, duration: 0.12, gain: 0.2 });
  }

  land(): void {
    this.noise({ duration: 0.12, gain: 0.15, filterType: 'lowpass', freq: 700, freqEnd: 120 });
  }

  /** Two tones (warm→cold to the FUTURE, cold→warm to the PAST) + a glitch. */
  switchWorld(toFuture: boolean): void {
    if (toFuture) {
      this.blip({ type: 'sine', freq: 330, duration: 0.1, gain: 0.18 });
      this.blip({ type: 'sine', freq: 760, duration: 0.14, gain: 0.18, delay: 0.07 });
    } else {
      this.blip({ type: 'sine', freq: 680, duration: 0.1, gain: 0.18 });
      this.blip({ type: 'sine', freq: 300, duration: 0.16, gain: 0.18, delay: 0.07 });
    }
    this.blip({ type: 'square', freq: toFuture ? 1200 : 200, duration: 0.04, gain: 0.05, delay: 0.04 });
  }

  /** Dissonant low buzz (two beating squares) when a switch is refused. */
  switchDenied(): void {
    this.blip({ type: 'square', freq: 130, freqEnd: 90, duration: 0.18, gain: 0.12 });
    this.blip({ type: 'square', freq: 138, freqEnd: 96, duration: 0.18, gain: 0.09 });
  }

  death(): void {
    this.blip({ type: 'sawtooth', freq: 420, freqEnd: 60, duration: 0.5, gain: 0.18 });
    this.noise({ duration: 0.3, gain: 0.11, filterType: 'lowpass', freq: 900, freqEnd: 200, delay: 0.02 });
  }

  exit(): void {
    [392, 523.25, 659.25, 783.99].forEach((f, i) =>
      this.blip({ type: 'triangle', freq: f, duration: 0.3, gain: 0.16, delay: i * 0.08 }),
    );
  }

  // --- exposed now, wired when the mechanics land (Phase E/F) --------------

  dash(): void {
    this.noise({ duration: 0.22, gain: 0.15, filterType: 'bandpass', freq: 400, freqEnd: 1900, q: 1.2 });
  }

  collectible(): void {
    [523.25, 659.25, 783.99].forEach((f, i) =>
      this.blip({ type: 'sine', freq: f, duration: 0.12, gain: 0.16, delay: i * 0.06 }),
    );
  }

  checkpoint(): void {
    [392, 493.88, 587.33].forEach((f) =>
      this.blip({ type: 'sine', freq: f, duration: 0.5, gain: 0.12, attack: 0.04 }),
    );
  }

  // --- UI SFX --------------------------------------------------------------

  menuHover(): void {
    this.blip({ type: 'triangle', freq: 440, duration: 0.05, gain: 0.1 });
  }

  menuSelect(): void {
    this.blip({ type: 'square', freq: 880, duration: 0.1, gain: 0.1 });
    this.blip({ type: 'square', freq: 1100, duration: 0.1, gain: 0.1, delay: 0.05 });
  }

  // --- synthesis helpers ---------------------------------------------------

  private blip(o: BlipOpts): void {
    const t = this.ctx.currentTime + (o.delay ?? 0);
    const osc = this.ctx.createOscillator();
    osc.type = o.type;
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), t + o.duration);
    }

    const gain = this.ctx.createGain();
    const attack = o.attack ?? 0.005;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(o.gain, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.duration);

    let head: AudioNode = osc;
    if (o.filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = o.filter.type;
      f.frequency.setValueAtTime(o.filter.freq, t);
      if (o.filter.q !== undefined) f.Q.setValueAtTime(o.filter.q, t);
      osc.connect(f);
      head = f;
    }
    head.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + o.duration + 0.03);
  }

  private noise(o: NoiseOpts): void {
    const t = this.ctx.currentTime + (o.delay ?? 0);
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * o.duration));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = o.filterType;
    filter.frequency.setValueAtTime(o.freq, t);
    if (o.freqEnd !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), t + o.duration);
    if (o.q !== undefined) filter.Q.value = o.q;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(o.gain, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(t);
    src.stop(t + o.duration + 0.02);
  }
}

let instance: Sfx | undefined;

/** Lazily-created shared Sfx instance (one AudioContext for the whole app). */
export function getSfx(): Sfx {
  if (!instance) instance = new Sfx();
  return instance;
}
