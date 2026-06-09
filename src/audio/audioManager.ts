// Synthesized audio (no asset files): short UI blips + a depth-driven ambient bed that
// deepens into dread. Everything routes through a master gain tied to the volume setting.
type Ctx = AudioContext;

class AudioManager {
  private ctx?: Ctx;
  private master?: GainNode;
  private volume = 0.7;

  // ambient
  private droneA?: OscillatorNode;
  private droneB?: OscillatorNode;
  private droneGain?: GainNode;
  private noiseGain?: GainNode;
  private voiceOsc?: OscillatorNode;
  private voiceGain?: GainNode;

  private ensure(): void {
    if (this.ctx) return;
    const Ctor: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(ctx.destination);
    this.startAmbient(ctx);
  }

  resume(): void {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  private blip(freq: number, dur: number, type: OscillatorType, gain: number): void {
    if (this.volume <= 0) return;
    this.ensure();
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  click(): void {
    this.blip(330, 0.06, 'triangle', 0.16);
  }
  collect(combo = 1): void {
    this.blip(380 + Math.min(combo, 40) * 16, 0.09, 'triangle', 0.2);
  }
  back(): void {
    this.blip(240, 0.11, 'sine', 0.18);
  }
  /** A small ascending chime when a haul is banked at the surface — the satisfying payoff. */
  bank(): void {
    this.blip(523, 0.1, 'triangle', 0.18);
    window.setTimeout(() => this.blip(659, 0.1, 'triangle', 0.16), 60);
    window.setTimeout(() => this.blip(880, 0.16, 'triangle', 0.15), 120);
  }
  purchase(): void {
    this.blip(523, 0.07, 'triangle', 0.18);
    window.setTimeout(() => this.blip(784, 0.1, 'triangle', 0.18), 55);
  }
  error(): void {
    this.blip(120, 0.16, 'sawtooth', 0.12);
  }
  reboot(): void {
    this.blip(196, 0.5, 'sine', 0.16);
    window.setTimeout(() => this.blip(294, 0.5, 'sine', 0.14), 120);
    window.setTimeout(() => this.blip(392, 0.6, 'sine', 0.12), 240);
  }
  /** A low, wrong stinger for stepping into a landmark menu. */
  landmark(): void {
    this.blip(98, 0.45, 'sawtooth', 0.09);
    window.setTimeout(() => this.blip(62, 0.7, 'sine', 0.12), 90);
  }
  /** Two-thump heartbeat — played while the Signal is failing. */
  heartbeat(): void {
    this.blip(58, 0.12, 'sine', 0.2);
    window.setTimeout(() => this.blip(52, 0.16, 'sine', 0.16), 170);
  }

  private startAmbient(ctx: Ctx): void {
    const master = this.master!;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.025;
    droneGain.connect(master);
    const a = ctx.createOscillator();
    a.type = 'sine';
    a.frequency.value = 55;
    const b = ctx.createOscillator();
    b.type = 'sine';
    b.frequency.value = 55.4;
    a.connect(droneGain);
    b.connect(droneGain);
    a.start();
    b.start();

    // Filtered white noise — the "whisper" bed, silent until dread rises.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noise.connect(lp).connect(noiseGain).connect(master);
    noise.start();

    // A vowel-like "voice" — a sawtooth through a tight bandpass, silent until the deep bands.
    const voice = ctx.createOscillator();
    voice.type = 'sawtooth';
    voice.frequency.value = 104;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 520; // formant
    bp.Q.value = 6;
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0;
    voice.connect(bp).connect(voiceGain).connect(master);
    voice.start();

    this.droneA = a;
    this.droneB = b;
    this.droneGain = droneGain;
    this.noiseGain = noiseGain;
    this.voiceOsc = voice;
    this.voiceGain = voiceGain;
  }

  /** Update the ambient bed for the current depth + dread band (0..6). */
  setAmbient(depth: number, band: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const baseFreq = Math.max(34, 55 - depth * 0.4);
    this.droneA?.frequency.setTargetAtTime(baseFreq, t, 0.5);
    this.droneB?.frequency.setTargetAtTime(baseFreq + 0.4 + band * 0.6, t, 0.5);
    this.droneGain?.gain.setTargetAtTime(0.025 + band * 0.004, t, 0.5);
    this.noiseGain?.gain.setTargetAtTime(band >= 2 ? (band - 1) * 0.006 : 0, t, 0.8);
    // The voice swells in from band 3 — something just under the floor, learning to speak.
    this.voiceOsc?.frequency.setTargetAtTime(95 + band * 6, t, 0.6);
    this.voiceGain?.gain.setTargetAtTime(band >= 3 ? (band - 2) * 0.005 : 0, t, 1.0);
  }
}

export const audio = new AudioManager();
