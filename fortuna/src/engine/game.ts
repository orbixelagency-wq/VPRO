/**
 * Mundo 3D de Puerto Valmera: une renderer, ciudad (con streaming), entorno y clima, física,
 * jugador, cámara, tráfico, peatones, interiores, interacciones y audio ambiental.
 * El reloj viene de la simulación económica (worker); aquí solo se interpola entre ticks.
 * El mundo nunca decide nada económico: las acciones (comprar, dormir, abrir la terminal)
 * se comunican a la UI, que envía los `PlayerCommand` correspondientes.
 */
import * as THREE from 'three/webgpu';
import { Ambience, type AudioMix, type Indoor } from '../audio/ambience';
import { DISTRICTS } from '../data/districts';
import { MARKET_CLOSE_HOUR, MARKET_OPEN_HOUR } from '../economy/calendar';
import { weatherBlend, type Weather } from '../economy/weather';
import { PlayerModel } from '../entities/playerModel';
import { PlayerController } from '../gameplay/playerController';
import { ActorsMesh } from '../world/actorsMesh';
import { COAST_X, districtAt, generateCity, type CityLayout } from '../world/cityGen';
import { buildCityMeshes, type CityMeshes } from '../world/cityMesh';
import { DISTRICT_LIFE } from '../world/districtStyle';
import { Environment } from '../world/environment';
import { openState } from '../world/hours';
import { buildInteriors, type Interior, type SpotAction } from '../world/interiors';
import type { LandmarkId } from '../world/landmarks';
import { buildParts, type PartsMesh, type TickerRow } from '../world/partsMesh';
import { Crowd } from '../world/pedestrians';
import { buildRoadGraph, type RoadGraph } from '../world/roads';
import { TrafficSim } from '../world/traffic';
import { WeatherFx } from '../world/weatherFx';
import { Input, type InputFrame } from './input';
import { buildPhysics, initPhysics, VEHICLE_BODIES, type PhysicsWorld } from './physics';
import {
  createRenderer,
  DynamicResolution,
  QUALITY,
  type Quality,
  type RenderContext,
} from './renderer';
import { ThirdPersonCamera } from './thirdPersonCamera';

/** Acciones que la UI resuelve (terminal, compras, dormir). */
export type WorldAction = Exclude<SpotAction, 'exit'>;

export interface Prompt {
  label: string;
  /** Si no se puede usar ahora (p. ej. cerrado), el motivo. */
  disabled?: string;
}

export interface WorldOptions {
  seed: number;
  quality: Quality;
  forceWebGL: boolean;
  audio: AudioMix;
  onDistrict?: (id: string) => void;
  onProgress?: (label: string) => void;
  /** El render ha fallado de forma repetida (p. ej. WebGPU incompatible). */
  onRenderError?: (backend: string, error: unknown) => void;
  /** Texto de interacción disponible (tecla E) o null. */
  onPrompt?: (prompt: Prompt | null) => void;
  onAction?: (action: WorldAction, place: LandmarkId | null) => void;
  /** Fundido a negro al entrar o salir de un interior. */
  onFade?: (active: boolean) => void;
  onInterior?: (name: string | null) => void;
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
  cars: number;
  peds: number;
  tilesNear: number;
  weather: string;
  interior: string | null;
}

interface ActiveSpot {
  id: string;
  label: string;
  x: number;
  z: number;
  radius: number;
  action: SpotAction | `enter:${LandmarkId}`;
  place: LandmarkId | null;
}

const STEP = 1 / 60;
/** Pasos de física por fotograma: cubre el dt máximo (0,1 s) sin espiral de la muerte. */
const MAX_STEPS = 6;
const IDLE: InputFrame = {
  moveX: 0,
  moveZ: 0,
  run: false,
  jump: false,
  lookX: 0,
  lookY: 0,
  zoom: 0,
  interact: false,
};

const ENTER_LABEL: Partial<Record<LandmarkId, string>> = {
  casa: 'Entrar en casa',
  tienda: 'Entrar en Ultramarinos La Esquina',
  banco: 'Entrar en el Banco de Valmera',
  bolsa: 'Entrar en la Bolsa de Valmera',
};

/** Tráfico relativo por hora (hora punta a las 8 y a las 18). */
const TRAFFIC_BY_HOUR = [
  0.15, 0.1, 0.08, 0.08, 0.1, 0.2, 0.45, 0.85, 1, 0.8, 0.65, 0.65, 0.7, 0.75, 0.7, 0.65, 0.7, 0.85,
  1, 0.9, 0.65, 0.45, 0.32, 0.22,
];
/** Gente por la calle por hora (paseo de la tarde). */
const PEOPLE_BY_HOUR = [
  0.1, 0.06, 0.04, 0.03, 0.03, 0.06, 0.2, 0.5, 0.75, 0.7, 0.7, 0.8, 0.9, 0.85, 0.7, 0.6, 0.7, 0.85,
  1, 1, 0.9, 0.65, 0.35, 0.18,
];

export class GameWorld {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(62, 1, 0.2, 20000);
  private ctx!: RenderContext;
  private city!: CityLayout;
  private graph!: RoadGraph;
  private meshes!: CityMeshes;
  private env!: Environment;
  private phys!: PhysicsWorld;
  private player!: PlayerController;
  private model = new PlayerModel();
  private cam!: ThirdPersonCamera;
  private input!: Input;
  private traffic!: TrafficSim;
  private crowd!: Crowd;
  private actors!: ActorsMesh;
  private weatherFx!: WeatherFx;
  private interiors: Interior[] = [];
  private interiorMeshes = new Map<LandmarkId, PartsMesh>();
  private interiorGroup = new THREE.Group();
  private audio = new Ambience();
  private dyn = new DynamicResolution();
  private quality: Quality = 'medio';
  private paused = false;
  private last = performance.now();
  private acc = 0;
  /** Segundos reales de mundo (semáforos, animaciones), independientes del reloj económico. */
  private worldTime = 0;
  private frameTimes: number[] = [];
  private district = '';
  private districtTimer = 0;
  private lampTimer = 0;
  private slowTimer = 0;
  private clock = { tick: 0, hps: 0, at: performance.now() };
  private weather: Weather | null = null;
  private inside: Interior | null = null;
  private transitioning = false;
  private spots: ActiveSpot[] = [];
  private prompt: ActiveSpot | null = null;
  private promptKey = '';
  private stepDist = 0;
  private lastHour = -1;
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
    const preset = QUALITY[opts.quality];
    opts.onProgress?.('Arrancando el motor gráfico…');
    this.ctx = await createRenderer(this.canvas, opts.quality, opts.forceWebGL);
    opts.onProgress?.('Trazando calles y manzanas…');
    this.city = generateCity(opts.seed);
    this.graph = buildRoadGraph(this.city);
    this.meshes = buildCityMeshes(this.city, this.graph);
    this.meshes.setDetailRadius(preset.detailRadius);
    this.scene.add(this.meshes.group);
    opts.onProgress?.('Amueblando interiores…');
    this.interiors = buildInteriors(['casa', 'tienda', 'banco', 'bolsa']);
    for (const it of this.interiors) {
      const pm = buildParts(it.parts, this.meshes.partMaterials, `interior ${it.id}`);
      this.interiorMeshes.set(it.id, pm);
      this.interiorGroup.add(pm.group);
    }
    this.interiorGroup.visible = false;
    this.scene.add(this.interiorGroup);
    opts.onProgress?.('Encendiendo el sol…');
    this.env = new Environment(this.scene, preset.far, preset.lampLights);
    this.weatherFx = new WeatherFx(preset.weatherFx);
    this.weatherFx.onBolt = (d) => this.audio.thunder(d);
    this.scene.add(this.weatherFx.group);
    opts.onProgress?.('Calculando colisiones…');
    await initPhysics();
    this.phys = buildPhysics(this.city);
    for (const it of this.interiors) this.phys.addParts(it.parts);
    this.player = new PlayerController(this.phys, {
      x: this.city.spawn.x,
      y: 0.2,
      z: this.city.spawn.z,
    });
    this.scene.add(this.model.root);
    this.cam = new ThirdPersonCamera(this.camera, this.phys, this.player.collider);
    // Mirando desde la calle hacia el portal de casa.
    const home = this.city.landmarks.find((l) => l.id === 'casa');
    if (home) this.cam.yaw = Math.atan2(home.door.nx, home.door.nz);
    opts.onProgress?.('Poniendo la ciudad en marcha…');
    this.traffic = new TrafficSim(this.graph, opts.seed);
    this.crowd = new Crowd(this.city, this.graph, opts.seed);
    this.actors = new ActorsMesh(110, 220);
    this.scene.add(this.actors.group);
    this.buildSpots();
    this.input = new Input(this.canvas);
    this.audio.setMix(opts.audio);
    this.applyQuality(opts.quality);
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvas.parentElement ?? this.canvas);
    // Una primera pasada para que el primer fotograma ya tenga el sol, la vida y la cámara.
    this.phys.world.step();
    this.updateLife(0.016, true);
    this.updateEnvironment(0.016, true);
    this.meshes.update(this.player.position, 0);
    this.cam.update(1, IDLE, this.player.position);
    this.ctx.renderer.setAnimationLoop(() => this.frame());
    // Gancho para las pruebas automáticas.
    (window as unknown as { __fortuna?: unknown }).__fortuna = {
      stats: () => this.stats(),
      world: this,
    };
  }

  private buildSpots(): void {
    for (const l of this.city.landmarks) {
      if (!l.interior) continue;
      this.spots.push({
        id: `puerta:${l.id}`,
        label: ENTER_LABEL[l.id] ?? `Entrar en ${l.name}`,
        x: l.door.x + l.door.nx * 1.3,
        z: l.door.z + l.door.nz * 1.3,
        radius: 1.9,
        action: `enter:${l.id}`,
        place: l.id,
      });
    }
    for (const it of this.interiors)
      for (const s of it.spots) this.spots.push({ ...s, id: `${it.id}:${s.id}`, place: it.id });
  }

  private applyQuality(q: Quality): void {
    const p = QUALITY[q];
    this.quality = q;
    this.env.setShadowQuality(p.shadowMap, p.shadowRange);
    this.env.setFar(p.far);
    this.meshes.setDetailRadius(p.detailRadius);
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

  setAudio(mix: AudioMix): void {
    this.audio.setMix(mix);
  }

  /** Arranca el audio (debe venir de un gesto del usuario). */
  startAudio(): void {
    this.audio.start();
  }

  setTicker(rows: TickerRow[]): void {
    this.interiorMeshes.get('bolsa')?.ticker?.setRows(rows);
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

  /** Tiempo continuo en ticks (interpolado entre los que manda el worker). */
  private simTime(): number {
    const frac = Math.min(0.999, ((performance.now() - this.clock.at) / 1000) * this.clock.hps);
    return this.clock.tick + frac;
  }

  /** Hora del día interpolada (0–24) y día del año. */
  private timeOfDay(): { hour: number; day: number } {
    const t = this.simTime();
    return { hour: t % 24, day: Math.floor(t / 24) % 365 };
  }

  setPaused(p: boolean): void {
    this.paused = p;
    this.input.enabled = !p;
    this.audio.setMuted(p);
    if (p && document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.last = performance.now();
  }

  requestPointerLock(): void {
    this.audio.start();
    if (!this.paused) this.canvas.requestPointerLock?.();
  }

  // --- Interiores ---

  private enter(id: LandmarkId): void {
    const it = this.interiors.find((x) => x.id === id);
    if (!it || this.transitioning) return;
    this.fade(() => {
      this.inside = it;
      this.player.teleport(it.spawn.x, 0.25, it.spawn.z);
      this.cam.yaw = it.spawn.facing;
      this.cam.distance = Math.min(this.cam.distance, 3.6);
      this.cam.snap();
      this.meshes.group.visible = false;
      this.actors.group.visible = false;
      this.interiorGroup.visible = true;
      this.opts.onInterior?.(it.name);
      this.audio.blip();
    });
  }

  private exit(): void {
    const it = this.inside;
    if (!it || this.transitioning) return;
    const l = this.city.landmarks.find((x) => x.id === it.id)!;
    this.fade(() => {
      this.inside = null;
      const x = l.door.x + l.door.nx * 1.8;
      const z = l.door.z + l.door.nz * 1.8;
      this.player.teleport(x, this.groundAt(x, z), z);
      // Cámara a la espalda del jugador, mirando a la calle.
      this.cam.yaw = Math.atan2(-l.door.nx, -l.door.nz);
      this.cam.snap();
      this.meshes.group.visible = true;
      this.actors.group.visible = true;
      this.interiorGroup.visible = false;
      this.opts.onInterior?.(null);
    });
  }

  /** Altura del suelo en un punto (el pórtico de la Bolsa está sobre un podio). */
  private groundAt(x: number, z: number): number {
    const R = this.phys.rapier;
    const ray = new R.Ray({ x, y: 8, z }, { x: 0, y: -1, z: 0 });
    // Solo lo estático: ni sensores (copas) ni cinemáticos (coches, el propio jugador).
    const flags = R.QueryFilterFlags.EXCLUDE_SENSORS | R.QueryFilterFlags.EXCLUDE_KINEMATIC;
    const hit = this.phys.world.castRay(ray, 20, true, flags);
    return hit ? 8 - hit.timeOfImpact + 0.05 : 0.3;
  }

  private fade(midway: () => void): void {
    this.transitioning = true;
    this.opts.onFade?.(true);
    window.setTimeout(() => {
      midway();
      this.updateEnvironment(0.016, true);
      window.setTimeout(() => {
        this.opts.onFade?.(false);
        this.transitioning = false;
      }, 120);
    }, 320);
  }

  /** Punto de interacción más cercano al jugador. */
  private updatePrompt(): void {
    const p = this.player.position;
    let best: ActiveSpot | null = null;
    let bestD = Infinity;
    for (const s of this.spots) {
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d < s.radius && d < bestD) {
        bestD = d;
        best = s;
      }
    }
    let prompt: Prompt | null = null;
    if (best) {
      prompt = { label: best.label };
      const enter = best.action.startsWith('enter:');
      if (enter && best.place) {
        const st = openState(best.place, Math.floor(this.simTime()));
        if (!st.open) prompt.disabled = st.note;
      }
    }
    this.prompt = best;
    const key = prompt ? `${prompt.label}|${prompt.disabled ?? ''}` : '';
    if (key !== this.promptKey) {
      this.promptKey = key;
      this.opts.onPrompt?.(prompt);
    }
  }

  private interact(): void {
    const s = this.prompt;
    if (!s || this.transitioning) return;
    if (s.action.startsWith('enter:')) {
      const id = s.action.slice(6) as LandmarkId;
      if (!openState(id, Math.floor(this.simTime())).open) return;
      this.enter(id);
    } else if (s.action === 'exit') this.exit();
    else {
      this.audio.blip();
      this.opts.onAction?.(s.action as WorldAction, s.place);
    }
  }

  private weatherOverride: Partial<Weather> = {};

  /** Para pruebas y capturas: fuerza parámetros del clima (vacío = el real). */
  debugWeather(w: Partial<Weather>): void {
    this.weatherOverride = w;
    this.slowTimer = 0;
  }

  /** Para pruebas y atajos: entra directamente en un interior. */
  debugEnter(id: LandmarkId): void {
    this.enter(id);
  }

  // --- Ciudad viva ---

  private updateLife(dt: number, force = false): void {
    if (this.inside && !force) return;
    const p = this.player.position;
    const preset = QUALITY[this.quality];
    const hour = Math.floor(this.timeOfDay().hour) % 24;
    const t = Math.floor(this.simTime());
    const weekend = Math.floor(t / 24) % 7 >= 5;
    const w = this.weather;
    const rain = w ? Math.max(w.rain, w.snow) : 0;
    const life = DISTRICT_LIFE[this.district] ?? { crowd: 0.8, nature: 0.3 };
    const carTarget = Math.round(
      preset.cars * TRAFFIC_BY_HOUR[hour]! * (weekend ? 0.7 : 1) * (1 - rain * 0.15),
    );
    const pedTarget = Math.round(
      preset.peds * PEOPLE_BY_HOUR[hour]! * life.crowd * (1 - rain * 0.6) * (weekend ? 1.1 : 1),
    );
    const crossing = this.crowd.crossing();
    const obstacles = crossing.map((c) => ({ x: c.x, z: c.z, r: 0.45 }));
    if (!this.inside) obstacles.push({ x: p.x, z: p.z, r: 0.55 });
    this.traffic.update(dt, this.worldTime, {
      focus: { x: p.x, z: p.z },
      radius: 230,
      target: carTarget,
      obstacles,
      speedFactor: 1 - rain * 0.25 - (w?.fog ?? 0) * 0.25,
    });
    this.crowd.update(dt, this.worldTime, {
      focus: { x: p.x, z: p.z },
      radius: 120,
      target: pedTarget,
      umbrellas: rain > 0.05 ? 0.85 : 0,
      player: { x: p.x, z: p.z },
    });
    this.actors.updateCars(this.traffic.cars);
    this.actors.updatePeds(this.crowd.peds, rain > 0.05);
    this.syncVehicleBodies();
  }

  /** Los coches más cercanos reciben un cuerpo cinemático: el jugador choca con ellos. */
  private syncVehicleBodies(): void {
    const p = this.player.position;
    const near = this.traffic.cars
      .map((c) => ({ c, d: (c.x - p.x) ** 2 + (c.z - p.z) ** 2 }))
      .filter((x) => x.d < 45 * 45)
      .sort((a, b) => a.d - b.d)
      .slice(0, VEHICLE_BODIES);
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    this.phys.vehicles.forEach((body, i) => {
      const n = near[i];
      if (!n || this.inside) {
        body.setNextKinematicTranslation({ x: 0, y: -500 - i * 10, z: 0 });
        return;
      }
      const c = n.c;
      q.setFromAxisAngle(up, Math.atan2(c.hx, c.hz));
      body.setNextKinematicTranslation({ x: c.x, y: c.height / 2 + 0.05, z: c.z });
      body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      const col = body.collider(0);
      col.setHalfExtents({ x: c.width / 2, y: c.height / 2, z: c.len / 2 });
    });
  }

  private updateEnvironment(dt: number, force = false): void {
    const { hour, day } = this.timeOfDay();
    this.slowTimer -= dt;
    if (force || this.slowTimer <= 0 || !this.weather) {
      this.slowTimer = 0.25;
      this.weather = { ...weatherBlend(this.opts.seed, this.simTime()), ...this.weatherOverride };
    }
    const w = this.weather;
    this.lampTimer -= 1;
    const refreshLamps = force || this.lampTimer <= 0;
    if (refreshLamps) this.lampTimer = 15;
    this.weatherFx.update(dt, this.camera.position, w, !!this.inside, this.meshes.groundMaterials);
    this.env.update(
      hour,
      day,
      this.player.position,
      this.ctx.renderer,
      this.meshes.facades,
      this.meshes.lampHeadMaterial,
      refreshLamps ? this.meshes.lampPositions : [],
      { clouds: w.clouds, fog: w.fog, rain: w.rain, snow: w.snow, flash: this.weatherFx.flash },
      this.inside ? this.inside.lights : null,
    );
    this.meshes.partMaterials.night.value = this.env.night;
    this.actors.night.value = this.env.night;
    this.meshes.landmarks.setClock(hour);
    // Campana de la Bolsa al abrir y cerrar el mercado.
    const h = Math.floor(hour);
    if (
      this.lastHour >= 0 &&
      h !== this.lastHour &&
      (h === MARKET_OPEN_HOUR || h === MARKET_CLOSE_HOUR)
    ) {
      const bolsa = this.city.landmarks.find((l) => l.id === 'bolsa');
      const near =
        this.inside?.id === 'bolsa' ||
        (bolsa &&
          Math.hypot(bolsa.door.x - this.player.position.x, bolsa.door.z - this.player.position.z) <
            160);
      if (near && openState('bolsa', Math.floor(this.simTime())).open) this.audio.bell();
    }
    this.lastHour = h;
  }

  private updateAudio(): void {
    const p = this.player.position;
    let nearest = 999;
    let speed = 0;
    let carsNear = 0;
    for (const c of this.traffic.cars) {
      const d = Math.hypot(c.x - p.x, c.z - p.z);
      if (d < 60) carsNear++;
      if (d < nearest) {
        nearest = d;
        speed = c.v;
      }
    }
    let pedsNear = 0;
    for (const q of this.crowd.peds)
      if (Math.abs(q.x - p.x) < 25 && Math.abs(q.z - p.z) < 25) pedsNear++;
    const block = this.blockAtPlayer();
    const life = DISTRICT_LIFE[this.district] ?? { crowd: 0.8, nature: 0.3 };
    const green =
      block && (block.use === 'parque' || block.use === 'campo' || block.use === 'villas');
    const w = this.weather;
    this.audio.update(
      {
        indoor: (this.inside?.ambience ?? null) as Indoor,
        hour: this.timeOfDay().hour,
        rain: w ? Math.max(w.rain, w.snow * 0.3) : 0,
        wind: w?.wind ?? 0.2,
        traffic: Math.min(1, carsNear / 12),
        nearestCar: nearest,
        nearestCarSpeed: speed,
        crowd: Math.min(1, pedsNear / 14),
        nature: green ? 1 : life.nature,
        coast: THREE.MathUtils.clamp(1 - (p.x - COAST_X) / 260, 0, 1),
      },
      0.1,
    );
  }

  private blockAtPlayer() {
    const p = this.player.position;
    return this.city.blocks.find(
      (b) => p.x >= b.rect.x0 && p.x <= b.rect.x1 && p.z >= b.rect.z0 && p.z <= b.rect.z1,
    );
  }

  private audioTimer = 0;

  private frame(): void {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.paused) return;
    this.worldTime += dt;
    const input = this.transitioning ? IDLE : this.input.read();
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < MAX_STEPS) {
      this.player.update(
        STEP,
        input.jump && steps === 0 ? input : { ...input, jump: false },
        this.cam.yaw,
      );
      this.phys.world.step();
      this.acc -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) this.acc = 0;
    this.model.root.position.copy(this.player.position);
    this.model.root.rotation.y = this.player.facing;
    this.model.animate(dt, this.player.speed, this.player.grounded);
    this.cam.update(dt, input, this.player.position, this.invertY);
    this.updateLife(dt);
    this.updateEnvironment(dt);
    if (!this.inside) this.meshes.update(this.player.position, this.worldTime);
    if (this.inside?.id === 'bolsa') this.interiorMeshes.get('bolsa')?.ticker?.scroll(dt);
    this.updatePrompt();
    if (input.interact) this.interact();
    // Pasos.
    if (this.player.grounded && this.player.speed > 0.5) {
      this.stepDist += this.player.speed * dt;
      const stride = this.player.speed > 4 ? 1.35 : 0.72;
      if (this.stepDist > stride) {
        this.stepDist = 0;
        const b = this.blockAtPlayer();
        const soft =
          !this.inside &&
          b &&
          (b.use === 'parque' || b.use === 'campo') &&
          this.player.position.y > 0.1;
        this.audio.step(soft ? 'blando' : 'duro', this.player.speed > 4 ? 1 : 0.6);
      }
    }
    this.audioTimer -= dt;
    if (this.audioTimer <= 0) {
      this.audioTimer = 0.1;
      this.updateAudio();
    }
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

    // Estadísticas y barrio.
    this.frameTimes.push(dt * 1000);
    if (this.frameTimes.length > 120) this.frameTimes.shift();
    this.districtTimer -= dt;
    if (this.districtTimer <= 0 && !this.inside) {
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
      cars: this.traffic.cars.length,
      peds: this.crowd.peds.length,
      tilesNear: this.meshes.streamStats().near,
      weather: this.weather?.kind ?? '',
      interior: this.inside?.name ?? null,
    };
  }

  dispose(): void {
    this.ctx.renderer.setAnimationLoop(null);
    this.ro?.disconnect();
    this.input.dispose();
    this.audio.dispose();
    this.meshes.dispose();
    for (const m of this.interiorMeshes.values()) m.dispose();
    this.actors.dispose();
    this.weatherFx.dispose();
    this.phys.dispose();
    this.ctx.dispose();
    delete (window as unknown as { __fortuna?: unknown }).__fortuna;
  }
}
