# CLAUDE.md — FORTUNA: De cero a imperio

Simulador de vida económica en mundo abierto (web + escritorio). Este fichero es la
referencia rápida para trabajar en el proyecto. El plan por fases está en `PLAN.md`.

## Stack
- TypeScript estricto (`strict`, `noUncheckedIndexedAccess`), Vite 5, React 18 + Zustand (UI).
- Simulación económica en `src/economy`, **sin dependencias de render ni de UI**, ejecutada en un
  Web Worker (`src/worker/sim.worker.ts`).
- Three.js (WebGPU con fallback WebGL2) + Rapier: a partir de la Fase 3.
- Tests: Vitest (economía) y Playwright (humo). Empaquetado de escritorio: Tauri (Fase 12).

## Comandos (desde `fortuna/`)
| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm run build` | Typecheck + build de producción en `dist/` |
| `npm test` | Tests de la economía (determinismo, invariantes, operativa, banca, balance) |
| `npm run e2e` | Prueba de humo en Chromium (compila y sirve en :4173) |
| `npm run check` | CI local: typecheck + lint + formato + tests + build |
| `npm run sim -- <semilla> <años>` | Informe de calibración del mundo |
| `npm run balance -- <semillas> <años>` | Tabla de resultados de los bots de balance (bolsa y catálogo) |
| `npm run catalog -- <semilla> <años> [--clase id] [--csv f]` | Inspector del catálogo de inversiones |
| `BALANCE_SEEDS=20 BALANCE_YEARS=10 npm run test:balance` | Balance largo |

## Reglas de arquitectura
1. **La simulación es determinista.** Nada de `Math.random` ni `Date.now` en `src/economy` o
   `src/investments` (ESLint lo prohíbe). Usa `Rng` con el flujo del subsistema (`state.rng.*`).
   Cada subsistema tiene su flujo para que las acciones del jugador no alteren el azar ajeno.
2. **El dinero es de partida doble.** Todo movimiento pasa por `transfer()` en `ledger.ts`, en
   céntimos enteros. La suma del libro es siempre 0 (`checkInvariants`).
3. **El estado es JSON puro** (`SimState`): serializable, guardable y comparable. Sin clases,
   `Map` ni funciones dentro del estado.
4. **La UI nunca lee el estado interno**: recibe `SimView` (`economy/view.ts`) desde el worker.
   La información oculta (valor razonable, fraudes, rumores falsos) solo viaja en modo depuración.
5. **Contenido en datos**: países, sectores, nombres, conceptos del cuaderno… en `src/data`.
   La lógica no contiene textos de contenido salvo plantillas de noticias.
6. **El jugador solo cambia el mundo mediante `PlayerCommand`** (`applyCommand` en `sim.ts`).
7. Si cambias el esquema de `SimState`, sube `SCHEMA_VERSION` y añade una migración en
   `src/save/migrations.ts`.
8. **Catálogo de inversiones** (`src/investments`): un instrumento genérico (`types.ts`) valorado
   por factores (`factors.ts`) y un motor común (`engine.ts`) de operativa, ventas ilíquidas,
   investigación e impuestos. Cada clase de activo es un `ClassRules` en `classes/` (generación,
   eventos, rentas). Para añadir una clase: reglas + entrada en `classes/index.ts` + metadatos en
   `meta.ts`. Los textos de presentación (etiquetas de atributos y de información oculta) viven
   en `meta.ts`.
9. Lo que no cotiza en vivo se ejecuta al precio de las 18:00 (`execution: 'close'`). No rompas
   esta regla: evita arbitrajes con información de la tarde.

## Convenciones
- Código y comentarios en español; identificadores en inglés.
- Importes: céntimos (`Cents`) dentro de la simulación; áureos (₳) en comandos y vistas.
- Precios de acciones y bonos en la divisa del emisor; se convierten con `country.fx` (₳ por unidad).
- 1 tick = 1 hora de juego. La partida empieza en `GAME_START_TICK` tras un año de historia.
- Commits pequeños con mensaje descriptivo en español.

## Antes de dar por terminada una tarea
`npm run check` en verde y, si tocas la UI, `npm run e2e` y una revisión visual.
Si tocas precios o reglas económicas, ejecuta `npm run balance` y comprueba `BALANCE.md`.
