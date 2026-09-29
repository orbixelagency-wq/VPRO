/**
 * Horizonte procedural de Puerto Valmera al anochecer para la pantalla de título.
 * Todo se genera por código: cielo, estrellas, tres capas de edificios con parallax,
 * ventanas que se encienden y una línea de cotización dorada que cruza el cielo.
 */
import { Rng } from '../../economy/rng';

interface Building {
  x: number;
  w: number;
  h: number;
  roof: 'flat' | 'spire' | 'step' | 'antenna' | 'dome';
  windows: { x: number; y: number; on: boolean; phase: number; warm: number }[];
}

interface Layer {
  depth: number;
  color: string;
  buildings: Building[];
  width: number;
}

export class Skyline {
  private layers: Layer[] = [];
  private stars: { x: number; y: number; r: number; tw: number }[] = [];
  private chart: number[] = [];
  private t0 = performance.now();
  private raf = 0;
  private w = 0;
  private h = 0;
  private dpr = 1;

  constructor(
    private canvas: HTMLCanvasElement,
    seed = 20310101,
  ) {
    const rng = Rng.fromSeed(seed, 'skyline');
    for (let i = 0; i < 220; i++)
      this.stars.push({
        x: rng.next(),
        y: rng.next() * 0.55,
        r: rng.range(0.3, 1.3),
        tw: rng.range(0, Math.PI * 2),
      });
    const colors = ['#1a1f2b', '#12161f', '#0a0c11'];
    const depthCfg = [
      { depth: 0.25, minH: 0.18, maxH: 0.42, minW: 30, maxW: 70 },
      { depth: 0.55, minH: 0.12, maxH: 0.5, minW: 40, maxW: 110 },
      { depth: 1, minH: 0.08, maxH: 0.36, minW: 60, maxW: 150 },
    ];
    depthCfg.forEach((cfg, li) => {
      const buildings: Building[] = [];
      let x = 0;
      const width = 3200;
      while (x < width) {
        const w = rng.range(cfg.minW, cfg.maxW);
        // Distrito financiero en el centro: torres más altas.
        const center = 1 - Math.min(1, Math.abs(x / width - 0.5) * 2.2);
        const h = rng.range(cfg.minH, cfg.maxH) * (0.7 + center * 0.9);
        const roof = rng.weighted(['flat', 'spire', 'step', 'antenna', 'dome'] as const, (r) =>
          r === 'flat' ? 5 : r === 'step' ? 2 : 1,
        );
        const windows: Building['windows'] = [];
        const cols = Math.max(2, Math.floor(w / 9));
        const rows = 60;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (rng.chance(li === 2 ? 0.3 : 0.2))
              windows.push({
                x: (c + 0.5) / cols,
                y: r / rows,
                on: rng.chance(0.55),
                phase: rng.range(0, 1000),
                warm: rng.next(),
              });
          }
        }
        buildings.push({ x, w, h, roof, windows });
        x += w + rng.range(2, 18);
      }
      this.layers.push({ depth: cfg.depth, color: colors[li]!, buildings, width });
    });
    // Línea de cotización: paseo aleatorio suavizado con tendencia alcista.
    let v = 0;
    for (let i = 0; i < 400; i++) {
      v += rng.gauss() * 0.9 + 0.12;
      this.chart.push(v);
    }
  }

  start(): void {
    const loop = () => {
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w !== this.w || h !== this.h || dpr !== this.dpr) {
      this.w = w;
      this.h = h;
      this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
  }

  private draw(): void {
    this.resize();
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const { w, h, dpr } = this;
    const t = (performance.now() - this.t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Cielo: noche arriba, brasas del atardecer en el horizonte.
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#05070b');
    sky.addColorStop(0.45, '#0d1220');
    sky.addColorStop(0.72, '#2a2230');
    sky.addColorStop(0.86, '#6b3f2a');
    sky.addColorStop(1, '#c07a3c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Resplandor del sol ya puesto.
    const glow = ctx.createRadialGradient(
      w * 0.68,
      h * 0.98,
      10,
      w * 0.68,
      h * 0.98,
      Math.max(w, h) * 0.7,
    );
    glow.addColorStop(0, 'rgba(255,190,110,0.35)');
    glow.addColorStop(0.35, 'rgba(216,140,80,0.12)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    for (const s of this.stars) {
      const a = 0.35 + 0.35 * Math.sin(t * 1.3 + s.tw);
      ctx.fillStyle = `rgba(236,228,210,${a * (1 - s.y * 1.3)})`;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawChart(ctx, t);

    const drift = t * 6;
    const horizon = h * 0.97;
    this.layers.forEach((layer, li) => {
      const offset = (drift * layer.depth) % layer.width;
      ctx.fillStyle = layer.color;
      for (let rep = -1; rep <= Math.ceil(w / layer.width); rep++) {
        for (const b of layer.buildings) {
          const x = b.x - offset + rep * layer.width;
          if (x > w || x + b.w < 0) continue;
          const bh = b.h * h * (0.7 + layer.depth * 0.45);
          const top = horizon - bh;
          ctx.fillStyle = layer.color;
          ctx.fillRect(x, top, b.w, bh + 4);
          this.drawRoof(ctx, b, x, top);
          // Ventanas: se encienden y apagan lentamente.
          if (li > 0) {
            for (const win of b.windows) {
              const wy = top + 8 + win.y * (bh - 12);
              if (wy > horizon - 6) continue;
              const blink = Math.sin(t * 0.05 + win.phase) > 0.92 ? !win.on : win.on;
              if (!blink) continue;
              const alpha = li === 2 ? 0.75 : 0.35;
              ctx.fillStyle =
                win.warm > 0.8
                  ? `rgba(160,200,255,${alpha * 0.8})`
                  : `rgba(255,${200 + Math.floor(win.warm * 30)},130,${alpha})`;
              ctx.fillRect(x + win.x * b.w - 1.5, wy, 3, 2);
            }
          }
          // Luz roja de balizamiento en las torres altas.
          if (b.roof === 'antenna' && li === 2 && Math.sin(t * 3 + b.x) > 0.3) {
            ctx.fillStyle = 'rgba(255,70,60,0.9)';
            ctx.beginPath();
            ctx.arc(x + b.w / 2, top - 26, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      // Bruma entre capas.
      const haze = ctx.createLinearGradient(0, horizon - h * 0.25, 0, horizon);
      haze.addColorStop(0, 'rgba(40,30,40,0)');
      haze.addColorStop(1, `rgba(${li === 2 ? '7,8,10' : '60,40,40'},${li === 2 ? 0.9 : 0.25})`);
      ctx.fillStyle = haze;
      ctx.fillRect(0, horizon - h * 0.25, w, h * 0.25 + 10);
    });

    // Suelo / agua del puerto con reflejo.
    ctx.fillStyle = '#07080a';
    ctx.fillRect(0, horizon, w, h - horizon);

    // Viñeta.
    const vig = ctx.createRadialGradient(
      w * 0.5,
      h * 0.5,
      Math.min(w, h) * 0.3,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.8,
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  private drawRoof(ctx: CanvasRenderingContext2D, b: Building, x: number, top: number): void {
    switch (b.roof) {
      case 'spire':
        ctx.beginPath();
        ctx.moveTo(x + b.w * 0.3, top);
        ctx.lineTo(x + b.w / 2, top - b.w * 0.9);
        ctx.lineTo(x + b.w * 0.7, top);
        ctx.fill();
        break;
      case 'step':
        ctx.fillRect(x + b.w * 0.15, top - 14, b.w * 0.7, 14);
        ctx.fillRect(x + b.w * 0.3, top - 24, b.w * 0.4, 10);
        break;
      case 'antenna':
        ctx.fillRect(x + b.w / 2 - 1, top - 26, 2, 26);
        break;
      case 'dome':
        ctx.beginPath();
        ctx.arc(x + b.w / 2, top, b.w * 0.35, Math.PI, 0);
        ctx.fill();
        break;
      default:
        break;
    }
  }

  private drawChart(ctx: CanvasRenderingContext2D, t: number): void {
    const { w, h } = this;
    const n = this.chart.length;
    const progress = Math.min(1, t / 6);
    const visible = Math.max(2, Math.floor(n * progress));
    const min = Math.min(...this.chart);
    const max = Math.max(...this.chart);
    const y = (v: number) => h * 0.62 - ((v - min) / (max - min)) * h * 0.4;
    const x = (i: number) => (i / (n - 1)) * w;
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(216,176,98,0)');
    grad.addColorStop(0.5, 'rgba(216,176,98,0.35)');
    grad.addColorStop(1, 'rgba(240,207,138,0.9)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = 'rgba(240,207,138,0.6)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < visible; i++) {
      if (i === 0) ctx.moveTo(x(i), y(this.chart[i]!));
      else ctx.lineTo(x(i), y(this.chart[i]!));
    }
    ctx.stroke();
    const lx = x(visible - 1);
    const ly = y(this.chart[visible - 1]!);
    ctx.fillStyle = '#f0cf8a';
    ctx.beginPath();
    ctx.arc(lx, ly, 2.6 + Math.sin(t * 4) * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
