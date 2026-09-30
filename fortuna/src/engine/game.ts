/**
 * Mundo 3D de Puerto Valmera: une renderer, ciudad, entorno, física, jugador y cámara.
 * El reloj viene de la simulación económica (worker); aquí solo se interpola entre ticks.
 */
import * as THREE from 'three/webgpu';
import { DISTRICTS } from '../data/districts';
import { PlayerModel } from '../entities/playerModel';
import { PlayerController } from '../gameplay/playerController';
import { districtAt, generateCity, type CityLayout } from '../world/cityGen';
import { buildCityMeshes, type CityMeshes } from '../world/cityMesh';
import { Environment } from '../world/environment';
import { Input } from './input';
import { buildPhysics, initPhysics, type PhysicsWorld } from './physics';
import {
  createRenderer,
  DynamicResolution,
  QUALITY,
  type Quality,
  type RenderContext,
} from './renderer';
import { ThirdPersonCamera } from './thirdPersonCamera';

export interface WorldOptions {
  seed: number;
  quality: Quality;
  forceWebGL: boolean;
  onDistrict?: (id: string) => void;
  onProgress?: (label: string) => void;
  /** El render ha fallado de forma repetida (p. ej. WebGPU incompatible). */
  onRenderError?: (backend: string, error: unknown) => void;
}

export interface WorldStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  backend: string;
  quality: Quality;
  resolution: string;
  scale: number;
  position: { x: number; y: number; z: number };
  district: string;
  hour: number;
}

const STEP = 1 / 60;

export class GameWorld {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(62, 1, 0.2, 20000);
  private ctx!: RenderContext;
  private city!: CityLayout;
  private meshes!: CityMeshes;
  private env!: Environment;
  private phys!: PhysicsWorld;
  private player!: PlayerController;
  private model = new PlayerModel();
  private cam!: ThirdPersonCamera;
  private input!: Input;
  private dyn = new DynamicResolution();
  private quality: Quality = 'medio';
  private paused = false;
  private last = performance.now();
  private acc = 0;
  private frameTimes: number[] = [];
  private district = '';
  private districtTimer = 0;
  private lampTimer = 0;
  private clock = { tick: 0, hps: 0, at: performance.now() };
  private ro: ResizeObserver | null = null;
  invertY = false;
  private renderErrors = 0;

  private constructor(
    private canvas: HTMLCanvasElement,
    private opts: WorldOptions,
  ) {}

  static async create(canvas: HTMLCanvasElement, opts: WorldOptions): Promise<GameWorld> {
    const w = new GameWorld(canvas, opts);
    await w.init();
    return w;
  }

  private async init(): Promise<void> {
    const { opts } = this;
    this.quality = opts.quality;
    opts.onProgress?.('Arrancando el motor gráfico…');
    this.ctx = await createRenderer(this.canvas, opts.quality, opts.forceWebGL);
    opts.onProgress?.('Trazando calles y manzanas…');
    this.city = generateCity(opts.seed);
    this.meshes = buildCityMeshes(this.city);
    this.scene.add(this.meshes.group);
    opts.onProgress?.('Encendiendo el sol…');
    this.env = new Environment(
      this.scene,
      QUALITY[opts.quality].far,
      QUALITY[opts.quality].lampLights,
    );
    opts.onProgress?.('Calculando colisiones…');
    await initPhysics();
    this.phys = buildPhysics(this.city);
    this.player = new PlayerController(this.phys, {
      x: this.city.spawn.x,
      y: 0.2,
      z: this.city.spawn.z,
    });
    this.scene.add(this.model.root);
    this.cam = new ThirdPersonCamera(this.camera, this.phys, this.player.collider);
    this.input = new Input(this.canvas);
    this.applyQuality(opts.quality);
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvas.parentElement ?? this.canvas);
    // Una primera pasada para que el primer fotograma ya tenga el sol y la cámara colocados.
    this.phys.world.step();
    this.updateEnvironment(true);
    this.cam.update(
      1,
      { moveX: 0, moveZ: 0, run: false, jump: false, lookX: 0, lookY: 0, zoom: 0 },
      this.player.position,
    );
    this.ctx.renderer.setAnimationLoop(() => this.frame());
    // Gancho para las pruebas automáticas.
    (window as unknown as { __fortuna?: unknown }).__fortuna = {
      stats: () => this.stats(),
      world: this,
    };
  }

  private applyQuality(q: Quality): void {
    const p = QUALITY[q];
    this.quality = q;
    this.env.setShadowQuality(p.shadowMap, p.shadowRange);
    this.env.setFar(p.far);
    // El cielo es una caja de 9 km: la cámara debe verla entera (la niebla limita lo demás).
    this.camera.far = Math.max(12_000, p.far * 8);
    this.camera.updateProjectionMatrix();
    this.ctx.setQuality(q, this.scene, this.camera);
    this.dyn.scale = 1;
    this.applyPixelRatio();
  }

  setQuality(q: Quality): void {
    if (q !== this.quality) this.applyQuality(q);
  }

  private applyPixelRatio(): void {
    const cap = QUALITY[this.quality].pixelCap;
    const ratio = Math.min(window.devicePixelRatio || 1, cap) * this.dyn.scale;
    this.ctx.renderer.setPixelRatio(ratio);
  }

  private resize(): void {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, el.clientWidth);
    const h = Math.max(1, el.clientHeight);
    this.ctx.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Recibe el reloj de la simulación: tick actual y horas de juego por segundo real. */
  setClock(tick: number, hoursPerSecond: number): void {
    this.clock = { tick, hps: hoursPerSecond, at: performance.now() };
  }

  /** Hora del día interpolada (0–24) y día del año. */
  private timeOfDay(): { hour: number; day: number } {
    const frac = Math.min(0.999, ((performance.now() - this.clock.at) / 1000) * this.clock.hps);
    const t = this.clock.tick + frac;
    return { hour: t % 24, day: Math.floor(t / 24) % 365 };
  }

  setPaused(p: boolean): void {
    this.paused = p;
    this.input.enabled = !p;
    if (p && document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.last = performance.now();
  }

  requestPointerLock(): void {
    if (!this.paused) this.canvas.requestPointerLock?.();
  }

  private updateEnvironment(force = false): void {
    const { hour, day } = this.timeOfDay();
    this.lampTimer -= 1;
    const refreshLamps = force || this.lampTimer <= 0;
    if (refreshLamps) this.lampTimer = 15;
    this.env.update(
      hour,
      day,
      this.player.position,
      this.ctx.renderer,
      this.meshes.facades,
      this.meshes.lampHeads,
      refreshLamps ? this.meshes.lampPositions : [],
      0.3,
    );
  }

  private frame(): void {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.paused) return;
    const input = this.input.read();
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < 5) {
      this.player.update(
        STEP,
        input.jump && steps === 0 ? input : { ...input, jump: false },
        this.cam.yaw,
      );
      this.phys.world.step();
      this.acc -= STEP;
      steps++;
    }
    if (steps === 5) this.acc = 0;
    this.model.root.position.copy(this.player.position);
    this.model.root.rotation.y = this.player.facing;
    this.model.animate(dt, this.player.speed, this.player.grounded);
    this.cam.update(dt, input, this.player.position, this.invertY);
    this.updateEnvironment();
    // El cambio de resolución vacía el lienzo: se aplica justo antes de dibujar, nunca después.
    if (this.dyn.update(dt * 1000)) this.applyPixelRatio();
    try {
      this.ctx.render(this.scene, this.camera);
      this.renderErrors = 0;
    } catch (e) {
      // Algunos navegadores anuncian WebGPU pero fallan al usarlo: se avisa para reintentar con WebGL2.
      if (++this.renderErrors === 3) {
        this.ctx.renderer.setAnimationLoop(null);
        this.opts.onRenderError?.(this.ctx.backend, e);
      }
    }

    // Estadísticas y resolución dinámica.
    this.frameTimes.push(dt * 1000);
    if (this.frameTimes.length > 120) this.frameTimes.shift();
    this.districtTimer -= dt;
    if (this.districtTimer <= 0) {
      this.districtTimer = 0.5;
      const d = districtAt(this.player.position.x, this.player.position.z);
      if (d !== this.district) {
        this.district = d;
        this.opts.onDistrict?.(d);
      }
    }
  }

  stats(): WorldStats {
    const avg = this.frameTimes.length
      ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      : 16.7;
    const info = this.ctx.renderer.info.render as {
      drawCalls?: number;
      calls?: number;
      triangles?: number;
    };
    const size = this.ctx.renderer.getDrawingBufferSize(new THREE.Vector2());
    const p = this.player.position;
    return {
      fps: Math.round(1000 / avg),
      frameMs: Math.round(avg * 10) / 10,
      drawCalls: info.drawCalls ?? info.calls ?? 0,
      triangles: info.triangles ?? 0,
      backend: this.ctx.backend,
      quality: this.quality,
      resolution: `${size.x}×${size.y}`,
      scale: Math.round(this.dyn.scale * 100) / 100,
      position: {
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        z: Math.round(p.z * 10) / 10,
      },
      district: DISTRICTS.find((d) => d.id === this.district)?.name ?? '',
      hour: Math.round(this.timeOfDay().hour * 10) / 10,
    };
  }

  dispose(): void {
    this.ctx.renderer.setAnimationLoop(null);
    this.ro?.disconnect();
    this.input.dispose();
    this.meshes.dispose();
    this.phys.dispose();
    this.ctx.dispose();
    delete (window as unknown as { __fortuna?: unknown }).__fortuna;
  }
}
