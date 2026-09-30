import { useEffect, useRef, useState } from 'react';
import { DISTRICTS } from '../../data/districts';
import type { GameWorld, Prompt, WorldAction, WorldStats } from '../../engine/game';
import type { LandmarkId } from '../../world/landmarks';
import { money } from '../format';
import { getClient, SPEED_LABELS, SPEED_VALUES, useGame } from '../store';
import { ShopModal } from './ShopModal';
import { WeatherChip } from './WeatherChip';

const HINT_MS = 14_000;

function partOfDay(hour: number): string {
  if (hour < 6) return 'Madrugada';
  if (hour < 12) return 'Mañana';
  if (hour < 14) return 'Mediodía';
  if (hour < 20) return 'Tarde';
  return 'Noche';
}

export function WorldView() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<GameWorld | null>(null);
  const seed = useGame((s) => s.view!.seed);
  const view = useGame((s) => s.view!);
  const terminalOpen = useGame((s) => s.terminalOpen);
  const setTerminal = useGame((s) => s.setTerminal);
  const settings = useGame((s) => s.settings);
  const setSettings = useGame((s) => s.setSettings);
  const speedIndex = useGame((s) => s.speedIndex);
  const setSpeed = useGame((s) => s.setSpeed);
  const pushToast = useGame((s) => s.pushToast);
  const [loading, setLoading] = useState('Construyendo Puerto Valmera…');
  const [district, setDistrict] = useState<{ id: string; at: number } | null>(null);
  const [stats, setStats] = useState<WorldStats | null>(null);
  const [hint, setHint] = useState(true);
  const [locked, setLocked] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [fade, setFade] = useState(false);
  const [interior, setInterior] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);

  // Acciones que pide el mundo (terminal en el banco o la bolsa, comprar, dormir).
  const onAction = (action: WorldAction, _place: LandmarkId | null) => {
    const st = useGame.getState();
    if (action === 'terminal:bank') {
      st.setTab('bank');
      st.setTerminal(true);
    } else if (action === 'terminal:stocks') {
      st.setTab('stocks');
      st.setTerminal(true);
    } else if (action === 'terminal:explore') {
      st.setTab('explore');
      st.setTerminal(true);
    } else if (action === 'shop') setShopOpen(true);
    else if (action === 'sleep') {
      st.pushToast({ kind: 'info', title: 'Te vas a dormir…', body: 'Hasta mañana a las 8:00.' });
      void getClient()
        .command({ type: 'waitUntil', hour: 8 })
        .then(() =>
          useGame.getState().pushToast({
            kind: 'good',
            title: 'Buenos días',
            body: 'Has dormido de un tirón. Los mercados han seguido su curso.',
          }),
        );
    }
  };

  // Arranque del mundo 3D (una sola vez por partida). Si WebGPU falla, se reintenta con WebGL2.
  useEffect(() => {
    let disposed = false;
    const boot = async (forceWebGL: boolean) => {
      try {
        const { GameWorld } = await import('../../engine/game');
        if (disposed || !canvas.current) return;
        const s = useGame.getState().settings;
        const world = await GameWorld.create(canvas.current, {
          seed,
          quality: s.quality,
          forceWebGL,
          audio: { master: s.volMaster, ambient: s.volAmbient, effects: s.volEffects },
          onPrompt: setPrompt,
          onAction: (a, p) => onActionRef.current(a, p),
          onFade: setFade,
          onInterior: setInterior,
          onProgress: setLoading,
          onDistrict: (id) => setDistrict({ id, at: Date.now() }),
          onRenderError: (backend) => {
            if (backend !== 'WebGPU' || disposed) return;
            world.dispose();
            worldRef.current = null;
            setLoading('Tu navegador tiene problemas con WebGPU: cambiando a WebGL2…');
            // El lienzo ya tiene un contexto WebGPU: hace falta uno nuevo.
            const fresh = canvas.current!.cloneNode() as HTMLCanvasElement;
            canvas.current!.replaceWith(fresh);
            (canvas as { current: HTMLCanvasElement | null }).current = fresh;
            fresh.addEventListener('click', () => worldRef.current?.requestPointerLock());
            void boot(true);
          },
        });
        if (disposed) {
          world.dispose();
          return;
        }
        worldRef.current = world;
        setLoading('');
      } catch (e) {
        console.error(e);
        if (!forceWebGL) return boot(true);
        useGame.setState({ worldFailed: true, terminalOpen: true });
        pushToast({
          kind: 'bad',
          title: 'No se pudo iniciar el mundo 3D',
          body: 'Tu navegador no admite WebGPU ni WebGL2. Puedes seguir jugando desde la terminal.',
        });
      }
    };
    void boot(useGame.getState().settings.forceWebGL);
    return () => {
      disposed = true;
      worldRef.current?.dispose();
      worldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  useEffect(() => {
    worldRef.current?.setAudio({
      master: settings.volMaster,
      ambient: settings.volAmbient,
      effects: settings.volEffects,
    });
  }, [settings.volMaster, settings.volAmbient, settings.volEffects, loading]);

  // El audio solo puede arrancar tras un gesto del jugador.
  useEffect(() => {
    if (loading) return;
    const start = () => worldRef.current?.startAudio();
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
  }, [loading]);

  // Panel de cotizaciones de la Bolsa con los precios reales de la simulación.
  useEffect(() => {
    const w = worldRef.current;
    if (!w) return;
    const rows = [...view.companies]
      .filter((c) => c.status === 'listed')
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 24)
      .map((c) => ({ id: c.id, price: c.price, change: c.changePct }));
    w.setTicker(rows);
  }, [view.companies, loading]);

  // Reloj de la simulación → cielo y luces.
  useEffect(() => {
    worldRef.current?.setClock(view.tick, SPEED_VALUES[speedIndex] ?? 0);
  }, [view.tick, speedIndex, loading]);

  useEffect(() => {
    worldRef.current?.setPaused(terminalOpen || shopOpen);
  }, [terminalOpen, shopOpen, loading]);

  useEffect(() => {
    worldRef.current?.setQuality(settings.quality);
    if (worldRef.current) worldRef.current.invertY = settings.invertY;
  }, [settings.quality, settings.invertY, loading]);

  // Teclas del mundo: Tab terminal, 1–5 velocidad, P pausa, F3 rendimiento.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return;
      const st = useGame.getState();
      if (e.code === 'Tab') {
        e.preventDefault();
        if (!st.worldFailed) st.setTerminal(!st.terminalOpen);
        return;
      }
      if (st.terminalOpen) return;
      if (e.code === 'Escape') setShopOpen(false);
      if (/^Digit[1-5]$/.test(e.code)) st.setSpeed(Number(e.code.slice(5)));
      else if (e.code === 'KeyP' || e.code === 'Digit0') st.setSpeed(0);
      else if (e.code === 'F3') {
        e.preventDefault();
        st.setSettings({ showStats: !st.settings.showStats });
      } else if (e.code === 'KeyN') st.openNotebook();
    };
    window.addEventListener('keydown', onKey);
    const onLock = () => setLocked(document.pointerLockElement === canvas.current);
    document.addEventListener('pointerlockchange', onLock);
    const hintTimer = window.setTimeout(() => setHint(false), HINT_MS);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerlockchange', onLock);
      window.clearTimeout(hintTimer);
    };
  }, []);

  useEffect(() => {
    if (!settings.showStats) return;
    const id = window.setInterval(
      () => worldRef.current && setStats(worldRef.current.stats()),
      500,
    );
    return () => window.clearInterval(id);
  }, [settings.showStats]);

  const d = district ? DISTRICTS.find((x) => x.id === district.id) : null;
  const showDistrict = d && Date.now() - district!.at < 5000;
  const [date, time] = view.date.split(' · ');
  const hour = Number((time ?? '0').split(':')[0]);

  return (
    <div className={`world ${terminalOpen ? 'dimmed' : ''}`}>
      <canvas
        ref={canvas}
        className="world-canvas"
        onClick={() => worldRef.current?.requestPointerLock()}
        tabIndex={-1}
        aria-label="Ciudad de Puerto Valmera"
      />
      {loading && (
        <div className="world-loading" role="status">
          <div className="loading-mark">F</div>
          <div className="loading-line">
            <span />
          </div>
          <div className="muted">{loading}</div>
        </div>
      )}
      {!loading && !terminalOpen && (
        <>
          <div className="hud hud-tl">
            <div className="hud-time mono">{time}</div>
            <div className="hud-date">
              {date} · {partOfDay(hour)}
            </div>
            <WeatherChip
              weather={view.meteo}
              forecast={view.forecast}
              night={hour < 7 || hour >= 21}
            />
            <div className="hud-speed">
              {SPEED_LABELS.map((l, i) => (
                <button
                  key={l}
                  className={`hud-chip ${speedIndex === i ? 'on' : ''}`}
                  onClick={() => setSpeed(i)}
                  title={`Tecla ${i === 0 ? 'P' : i}`}
                >
                  {i === 0 ? 'II' : l}
                </button>
              ))}
            </div>
          </div>
          <div className="hud hud-tr">
            <div className="eyebrow">Patrimonio</div>
            <div className="hud-money mono">{money(view.player.netWorth)}</div>
            <div className="hud-sub muted">Efectivo {money(view.player.cash, 0)}</div>
            <button className="hud-terminal" onClick={() => setTerminal(true)}>
              Terminal del inversor <kbd>Tab</kbd>
            </button>
          </div>
          {interior && <div className="hud-interior">{interior}</div>}
          {prompt && !fade && (
            <div className={`hud-prompt ${prompt.disabled ? 'off' : ''}`} role="status">
              {prompt.disabled ? (
                <>
                  <span className="prompt-label">{prompt.label}</span>
                  <span className="prompt-note">{prompt.disabled}</span>
                </>
              ) : (
                <>
                  <kbd>E</kbd>
                  <span className="prompt-label">{prompt.label}</span>
                </>
              )}
            </div>
          )}
          {showDistrict && d && !interior && (
            <div className="district-banner" key={district!.at}>
              <div className="eyebrow">{d.kind}</div>
              <div className="district-name">{d.name}</div>
              <div className="district-desc">{d.description}</div>
            </div>
          )}
          {hint && (
            <div className="hud-hint">
              <span>
                <kbd>W A S D</kbd> moverse
              </span>
              <span>
                <kbd>Mayús</kbd> correr
              </span>
              <span>
                <kbd>Espacio</kbd> saltar
              </span>
              <span>
                <kbd>Clic</kbd>{' '}
                {locked
                  ? 'cámara libre activa · Esc para soltar'
                  : 'controlar la cámara con el ratón'}
              </span>
              <span>
                <kbd>1–5</kbd> velocidad del tiempo · <kbd>P</kbd> pausa
              </span>
              <span>
                <kbd>E</kbd> entrar / usar
              </span>
              <span>
                <kbd>Tab</kbd> terminal
              </span>
            </div>
          )}
          {settings.showStats && stats && (
            <div className="hud-stats mono" aria-label="Rendimiento">
              <div>
                <b>{stats.fps}</b> fps · {stats.frameMs} ms
              </div>
              <div>
                {stats.backend} · {stats.quality} · {stats.resolution} (
                {Math.round(stats.scale * 100)} %)
              </div>
              <div>
                {stats.drawCalls} llamadas · {(stats.triangles / 1000).toFixed(0)} k triángulos
              </div>
              <div>
                {stats.district} · x {stats.position.x} z {stats.position.z}
              </div>
              <div>
                {stats.cars} coches · {stats.peds} peatones · {stats.tilesNear} teselas
              </div>
              <button className="btn sm ghost" onClick={() => setSettings({ showStats: false })}>
                Cerrar (F3)
              </button>
            </div>
          )}
        </>
      )}
      <div className={`world-fade ${fade ? 'on' : ''}`} aria-hidden />
      {shopOpen && <ShopModal onClose={() => setShopOpen(false)} />}
    </div>
  );
}
