/**
 * Entrada unificada: teclado, ratón (con bloqueo de puntero) y mando.
 */
export interface InputFrame {
  moveX: number; // derecha +
  moveZ: number; // adelante +
  run: boolean;
  jump: boolean;
  lookX: number;
  lookY: number;
  zoom: number;
  /** Tecla de acción (E / botón X del mando): entrar, usar, comprar. */
  interact: boolean;
}

export class Input {
  private keys = new Set<string>();
  private dx = 0;
  private dy = 0;
  private wheel = 0;
  private jumpQueued = false;
  private interactQueued = false;
  private padInteract = false;
  enabled = true;
  private dragging = false;

  constructor(private el: HTMLElement) {
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    el.addEventListener('mousemove', this.onMove);
    document.addEventListener('mousemove', this.onLockedMove);
    el.addEventListener('mousedown', this.onDown);
    window.addEventListener('mouseup', this.onUp);
    el.addEventListener('wheel', this.onWheel, { passive: true });
  }

  private onKey = (e: KeyboardEvent) => {
    if (!this.enabled || isTyping(e)) return;
    this.keys.add(e.code);
    if (e.code === 'Space') {
      this.jumpQueued = true;
      e.preventDefault();
    }
    if (e.code === 'KeyE' && !e.repeat) this.interactQueued = true;
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  private onBlur = () => this.keys.clear();
  private onDown = (e: MouseEvent) => {
    if (e.button === 0 || e.button === 2) this.dragging = true;
  };
  private onUp = () => {
    this.dragging = false;
  };
  private onMove = (e: MouseEvent) => {
    if (document.pointerLockElement === this.el || !this.dragging || !this.enabled) return;
    this.dx += e.movementX;
    this.dy += e.movementY;
  };
  private onLockedMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== this.el || !this.enabled) return;
    this.dx += e.movementX;
    this.dy += e.movementY;
  };
  private onWheel = (e: WheelEvent) => {
    if (this.enabled) this.wheel += Math.sign(e.deltaY);
  };

  /** Lee y consume la entrada acumulada desde el último fotograma. */
  read(): InputFrame {
    const k = this.keys;
    let moveX =
      (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) -
      (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let moveZ =
      (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let run = k.has('ShiftLeft') || k.has('ShiftRight');
    let jump = this.jumpQueued;
    let interact = this.interactQueued;
    let lookX = this.dx;
    let lookY = this.dy;
    const pad = navigator.getGamepads?.()[0];
    if (pad && this.enabled) {
      const dead = (v: number) => (Math.abs(v) < 0.15 ? 0 : v);
      moveX += dead(pad.axes[0] ?? 0);
      moveZ -= dead(pad.axes[1] ?? 0);
      lookX += dead(pad.axes[2] ?? 0) * 14;
      lookY += dead(pad.axes[3] ?? 0) * 10;
      run ||= !!pad.buttons[10]?.pressed || !!pad.buttons[5]?.pressed;
      jump ||= !!pad.buttons[0]?.pressed;
      const x = !!pad.buttons[2]?.pressed;
      interact ||= x && !this.padInteract;
      this.padInteract = x;
    }
    const zoom = this.wheel;
    this.dx = this.dy = this.wheel = 0;
    this.jumpQueued = false;
    this.interactQueued = false;
    const len = Math.hypot(moveX, moveZ);
    if (len > 1) {
      moveX /= len;
      moveZ /= len;
    }
    return { moveX, moveZ, run, jump, lookX, lookY, zoom, interact };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.el.removeEventListener('mousemove', this.onMove);
    document.removeEventListener('mousemove', this.onLockedMove);
    this.el.removeEventListener('mousedown', this.onDown);
    window.removeEventListener('mouseup', this.onUp);
    this.el.removeEventListener('wheel', this.onWheel);
  }
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
}
