import type { WorldId } from '../types';

interface DroneCfg {
  freqs: number[];
  type: OscillatorType;
  cutoff: number;
  q: number;
  lfoRate: number;
  lfoDepth: number;
}

const DRONE: Record<WorldId, DroneCfg> = {
  // PAST — warm, muffled (low triangle stack, gentle lowpass).
  past: { freqs: [55, 82.41, 110], type: 'triangle', cutoff: 420, q: 1, lfoRate: 0.07, lfoDepth: 120 },
  // FUTURE — cold, metallic (saw stack, brighter filter with moderate Q, faster LFO).
  future: { freqs: [49, 98, 146.83], type: 'sawtooth', cutoff: 780, q: 3, lfoRate: 0.16, lfoDepth: 260 },
};

/**
 * Per-world ambient drone: a small stack of low oscillators through a filter
 * modulated by a slow LFO. Switching worlds morphs tuning + filter (PAST warm /
 * FUTURE metallic). Routed through the shared master so mute applies.
 */
export default class Ambience {
  private readonly ctx: AudioContext;
  private readonly out: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly level = 0.06; // sits low in the mix

  private oscillators: OscillatorNode[] = [];
  private lfo?: OscillatorNode;
  private lfoGain?: GainNode;
  private ampLfo?: OscillatorNode;
  private ampLfoGain?: GainNode;
  private started = false;
  private world: WorldId = 'past';

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.0001;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = DRONE.past.cutoff;
    this.filter.Q.value = DRONE.past.q;
    this.filter.connect(this.out);
    this.out.connect(destination);
  }

  start(world: WorldId = 'past'): void {
    if (this.started) return;
    this.started = true;
    this.world = world;
    const cfg = DRONE[world];
    const t = this.ctx.currentTime;

    this.oscillators = cfg.freqs.map((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = cfg.type;
      o.frequency.setValueAtTime(f, t);
      o.detune.value = (i - 1) * 4; // slight spread for warmth
      o.connect(this.filter);
      o.start(t);
      return o;
    });

    this.lfo = this.ctx.createOscillator();
    this.lfo.frequency.value = cfg.lfoRate;
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.value = cfg.lfoDepth;
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);
    this.lfo.start(t);

    // Slow amplitude LFO so the drone breathes.
    this.ampLfo = this.ctx.createOscillator();
    this.ampLfo.frequency.value = 0.08;
    this.ampLfoGain = this.ctx.createGain();
    this.ampLfoGain.gain.value = 0.015;
    this.ampLfo.connect(this.ampLfoGain);
    this.ampLfoGain.connect(this.out.gain);
    this.ampLfo.start(t);

    this.out.gain.setValueAtTime(0.0001, t);
    this.out.gain.exponentialRampToValueAtTime(this.level, t + 0.8);
  }

  setWorld(world: WorldId): void {
    if (!this.started || world === this.world) return;
    this.world = world;
    const cfg = DRONE[world];
    const t = this.ctx.currentTime;
    const ramp = 0.4;

    this.oscillators.forEach((o, i) => {
      o.type = cfg.type;
      o.frequency.exponentialRampToValueAtTime(cfg.freqs[i] ?? cfg.freqs[0], t + ramp);
    });
    this.filter.frequency.exponentialRampToValueAtTime(cfg.cutoff, t + ramp);
    this.filter.Q.linearRampToValueAtTime(cfg.q, t + ramp);
    if (this.lfo) this.lfo.frequency.setValueAtTime(cfg.lfoRate, t);
    if (this.lfoGain) this.lfoGain.gain.linearRampToValueAtTime(cfg.lfoDepth, t + ramp);
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), t);
    this.out.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    this.ampLfoGain?.gain.linearRampToValueAtTime(0, t + 0.3); // fade the breathing out cleanly
    this.oscillators.forEach((o) => o.stop(t + 0.33));
    this.lfo?.stop(t + 0.33);
    this.ampLfo?.stop(t + 0.33);
  }
}
