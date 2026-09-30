/**
 * Audio ambiental sintetizado con WebAudio (sin ficheros): rumor de ciudad, tráfico, motor del
 * coche más cercano, lluvia, viento, gente, mar, pájaros y gaviotas, tono de cada interior,
 * truenos, campana de la Bolsa y pasos. Buses separados (ambiente y efectos) con volumen propio.
 * Se sustituye por grabaciones sin tocar el juego (ver ASSETS.md).
 */

export interface AudioMix {
  master: number;
  ambient: number;
  effects: number;
}

export type Indoor = 'casa' | 'tienda' | 'banco' | 'bolsa' | null;

export interface AmbienceInput {
  indoor: Indoor;
  hour: number;
  rain: number;
  wind: number;
  /** Densidad de tráfico cercano 0–1 y distancia al coche más próximo (m). */
  traffic: number;
  nearestCar: number;
  nearestCarSpeed: number;
  /** Gente cerca 0–1. */
  crowd: number;
  /** Naturaleza (parques, huertas) 0–1. */
  nature: number;
  /** Cercanía al mar 0–1. */
  coast: number;
}

interface Layer {
  gain: GainNode;
  filter?: BiquadFilterNode;
}

export class Ambience {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private ambientBus!: GainNode;
  private fxBus!: GainNode;
  private layers: Record<string, Layer> = {};
  private engine: { osc: OscillatorNode; gain: GainNode } | null = null;
  private hum: { osc: OscillatorNode; gain: GainNode } | null = null;
  private white!: AudioBuffer;
  private brown!: AudioBuffer;
  private mix: AudioMix = { master: 0.8, ambient: 0.8, effects: 0.8 };
  private nextBird = 2;
  private nextGull = 6;
  private last: AmbienceInput | null = null;

  /** Debe llamarse tras un gesto del usuario (política de autoplay). */
  start(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.master = ctx.createGain();
    this.master.connect(comp).connect(ctx.destination);
    this.ambientBus = ctx.createGain();
    this.fxBus = ctx.createGain();
    this.ambientBus.connect(this.master);
    this.fxBus.connect(this.master);
    this.white = this.noise(ctx, false);
    this.brown = this.noise(ctx, true);
    // Capas en bucle, todas empiezan en silencio.
    this.layers.city = this.loop(this.brown, 'lowpass', 320, 0.7);
    this.layers.traffic = this.loop(this.brown, 'bandpass', 220, 0.6);
    this.layers.rain = this.loop(this.white, 'highpass', 900, 0.5);
    this.layers.wind = this.loop(this.white, 'bandpass', 420, 0.8);
    this.layers.crowd = this.loop(this.white, 'bandpass', 950, 1.6);
    this.layers.sea = this.loop(this.brown, 'lowpass', 520, 0.7);
    this.layers.room = this.loop(this.brown, 'lowpass', 160, 0.7);
    // Motor del coche más cercano y zumbido eléctrico de interiores.
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 50;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 200;
    const eg = ctx.createGain();
    eg.gain.value = 0;
    osc.connect(lp).connect(eg).connect(this.ambientBus);
    osc.start();
    this.engine = { osc, gain: eg };
    const hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 100;
    const hg = ctx.createGain();
    hg.gain.value = 0;
    hum.connect(hg).connect(this.ambientBus);
    hum.start();
    this.hum = { osc: hum, gain: hg };
    this.applyMix();
  }

  setMix(mix: AudioMix): void {
    this.mix = mix;
    this.applyMix();
  }

  private applyMix(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.mix.master, t, 0.05);
    this.ambientBus.gain.setTargetAtTime(this.mix.ambient, t, 0.05);
    this.fxBus.gain.setTargetAtTime(this.mix.effects, t, 0.05);
  }

  /** Silencia todo (pausa, terminal abierta) sin perder el estado. */
  setMuted(muted: boolean): void {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(muted ? 0 : this.mix.master, this.ctx.currentTime, 0.25);
  }

  private noise(ctx: AudioContext, brown: boolean): AudioBuffer {
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      } else data[i] = w;
    }
    return buf;
  }

  private loop(buf: AudioBuffer, type: BiquadFilterType, freq: number, q: number): Layer {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(this.ambientBus);
    src.start(0, Math.random() * 2);
    return { gain, filter };
  }

  private set(layer: string, value: number, tau = 0.6): void {
    const l = this.layers[layer];
    if (!l || !this.ctx) return;
    l.gain.gain.setTargetAtTime(value, this.ctx.currentTime, tau);
  }

  /** Actualiza las capas (llamar ~10 veces por segundo). */
  update(input: AmbienceInput, dt: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.last = input;
    const t = ctx.currentTime;
    const day = input.hour >= 7 && input.hour <= 21 ? 1 : 0.35;
    const inside = input.indoor !== null;
    const muffle = inside ? 0.18 : 1;
    // Exterior (muy amortiguado dentro).
    this.set('city', (0.05 + 0.07 * day) * muffle);
    this.set('traffic', (0.02 + input.traffic * 0.16) * muffle);
    this.set('wind', input.wind * 0.07 * (inside ? 0.1 : 1) * (0.7 + 0.3 * Math.sin(t * 0.37)));
    this.layers.wind?.filter?.frequency.setTargetAtTime(300 + 250 * Math.sin(t * 0.21), t, 0.8);
    this.set('rain', input.rain * (inside ? 0.05 : 0.2));
    this.layers.rain?.filter?.frequency.setTargetAtTime(inside ? 380 : 900, t, 0.3);
    this.set('sea', input.coast * 0.14 * muffle * (0.55 + 0.45 * Math.sin(t * 0.8)));
    // Gente: calle o interior concurrido.
    const indoorCrowd =
      input.indoor === 'bolsa'
        ? 0.12
        : input.indoor === 'banco'
          ? 0.035
          : input.indoor === 'tienda'
            ? 0.015
            : 0;
    this.set('crowd', inside ? indoorCrowd : input.crowd * 0.06 * day);
    this.set('room', inside ? 0.06 : 0);
    if (this.hum)
      this.hum.gain.gain.setTargetAtTime(
        input.indoor === 'tienda' ? 0.012 : input.indoor === 'casa' ? 0.004 : 0,
        t,
        0.5,
      );
    if (this.engine) {
      const d = Math.max(3, input.nearestCar);
      const near = inside ? 0 : Math.min(0.12, 2.5 / (d * d));
      this.engine.gain.gain.setTargetAtTime(near, t, 0.2);
      this.engine.osc.frequency.setTargetAtTime(38 + input.nearestCarSpeed * 4, t, 0.3);
    }
    // Pájaros y gaviotas de día y sin lluvia.
    if (!inside && input.rain < 0.1 && day === 1) {
      this.nextBird -= dt;
      if (this.nextBird <= 0 && input.nature > 0.05) {
        this.chirp(0.5 + input.nature * 0.5);
        this.nextBird = 0.6 + Math.random() * (5 - input.nature * 3.5);
      }
      this.nextGull -= dt;
      if (this.nextGull <= 0 && input.coast > 0.25) {
        this.gull(input.coast);
        this.nextGull = 3 + Math.random() * 9;
      }
    }
  }

  private chirp(level: number): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + Math.random() * 0.2;
    const base = 2400 + Math.random() * 1800;
    const notes = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < notes; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = t0 + i * (0.09 + Math.random() * 0.05);
      o.type = 'sine';
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.4), t + 0.04);
      o.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.08);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.018 * level, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g).connect(this.ambientBus);
      o.start(t);
      o.stop(t + 0.1);
    }
  }

  private gull(level: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const s = t + i * 0.32;
      o.type = 'triangle';
      o.frequency.setValueAtTime(1500, s);
      o.frequency.exponentialRampToValueAtTime(820, s + 0.26);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.02 * level, s + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.28);
      o.connect(g).connect(this.ambientBus);
      o.start(s);
      o.stop(s + 0.3);
    }
  }

  /** Trueno: llega con el retraso del sonido y suena más grave cuanto más lejos. */
  thunder(distance: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + distance / 343;
    const src = ctx.createBufferSource();
    src.buffer = this.brown;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900 / (1 + distance / 900), t);
    f.frequency.exponentialRampToValueAtTime(60, t + 3.5);
    const g = ctx.createGain();
    const peak = Math.min(0.9, 1.4 / (1 + distance / 700)) * (this.last?.indoor ? 0.35 : 1);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
    src.connect(f).connect(g).connect(this.fxBus);
    src.start(t, Math.random());
    src.stop(t + 4.6);
  }

  /** Campana de apertura o cierre de la Bolsa. */
  bell(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let r = 0; r < 3; r++)
      for (const [f, a] of [
        [880, 0.08],
        [1320, 0.05],
        [2210, 0.03],
        [3520, 0.012],
      ] as const) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const s = t + r * 0.55;
        o.frequency.value = f;
        g.gain.setValueAtTime(a, s);
        g.gain.exponentialRampToValueAtTime(0.0001, s + 2.2);
        o.connect(g).connect(this.fxBus);
        o.start(s);
        o.stop(s + 2.3);
      }
  }

  /** Un paso: más seco en acera, más sordo en hierba o madera. */
  step(surface: 'duro' | 'blando', loud: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.white;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = surface === 'duro' ? 1400 + Math.random() * 500 : 450;
    f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05 * loud, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(f).connect(g).connect(this.fxBus);
    src.start(t, Math.random() * 2);
    src.stop(t + 0.1);
  }

  /** Clic suave de interfaz (comprar, entrar). */
  blip(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(660, t);
    o.frequency.exponentialRampToValueAtTime(990, t + 0.06);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(this.fxBus);
    o.start(t);
    o.stop(t + 0.16);
  }

  dispose(): void {
    void this.ctx?.close();
    this.ctx = null;
  }
}
