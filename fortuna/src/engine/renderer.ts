/**
 * Renderer: WebGPU con respaldo automático a WebGL2, presets de calidad, posproceso ligero
 * (bloom en Alto/Ultra) y escalado dinámico de resolución para sostener los fps objetivo.
 */
import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

import { QUALITY, type Quality } from './quality';

export { QUALITY, type Quality };

export interface RenderContext {
  renderer: THREE.WebGPURenderer;
  backend: 'WebGPU' | 'WebGL2';
  pipeline: THREE.RenderPipeline | null;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  setQuality(q: Quality, scene: THREE.Scene, camera: THREE.Camera): void;
  dispose(): void;
}

export async function createRenderer(
  canvas: HTMLCanvasElement,
  quality: Quality,
  forceWebGL: boolean,
): Promise<RenderContext> {
  const preset = QUALITY[quality];
  const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: preset.antialias,
    forceWebGL,
    powerPreference: 'high-performance',
  });
  await renderer.init();
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend
    ? 'WebGPU'
    : 'WebGL2';
  let pipeline: THREE.RenderPipeline | null = null;

  const ctx: RenderContext = {
    renderer,
    backend,
    pipeline,
    render(scene, camera) {
      if (pipeline) pipeline.render();
      else renderer.render(scene, camera);
    },
    setQuality(q, scene, camera) {
      const p = QUALITY[q];
      pipeline?.dispose();
      pipeline = null;
      if (p.bloom) {
        pipeline = new THREE.RenderPipeline(renderer);
        const scenePass = pass(scene, camera);
        const color = scenePass.getTextureNode('output');
        // Bloom sutil: solo brillan las luces (farolas, ventanas, sol).
        pipeline.outputNode = color.add(bloom(color, 0.35, 0.4, 0.85));
      }
      ctx.pipeline = pipeline;
    },
    dispose() {
      pipeline?.dispose();
      renderer.dispose();
    },
  };
  return ctx;
}

/**
 * Escalado dinámico de resolución: baja la resolución interna cuando el fotograma tarda
 * demasiado y la sube cuando sobra margen, sin pasar del tope del preset.
 */
export class DynamicResolution {
  scale = 1;
  private acc = 0;
  private frames = 0;
  constructor(
    private targetMs = 1000 / 60,
    private min = 0.5,
  ) {}

  /** Devuelve true si la escala ha cambiado. */
  update(frameMs: number): boolean {
    this.acc += frameMs;
    this.frames++;
    if (this.acc < 750) return false;
    const avg = this.acc / this.frames;
    this.acc = 0;
    this.frames = 0;
    const prev = this.scale;
    if (avg > this.targetMs * 1.12) this.scale = Math.max(this.min, this.scale * 0.9);
    // Si el fotograma llega a tiempo (sincronía vertical), se recupera resolución poco a poco.
    else if (avg < this.targetMs * 1.03) this.scale = Math.min(1, this.scale * 1.03);
    return Math.abs(prev - this.scale) > 0.001;
  }
}
