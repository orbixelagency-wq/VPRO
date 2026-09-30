# PLAN.md — FORTUNA: De cero a imperio

Estado de las fases del documento maestro. Cada fase termina con build limpio, tests en verde,
juego arrancando y resumen.

## Decisiones tomadas
- **Proyecto en `fortuna/`** dentro del repositorio: el repo ya contenía la web de Orbixel y no
  se toca. El juego es un paquete independiente con su propio `package.json`.
- **1 tick = 1 hora**: permite rutina diaria (Fase 6) y sesiones bursátiles con horario.
- **Un año de historia simulada antes de empezar**: gráficos y noticias desde el primer minuto.
- **Mercado casi eficiente**: los shocks de precio son casi permanentes y las noticias se
  descuentan en la apertura. Motivo: con un ancla conocida los bots de "valor" y "tendencias"
  duplicaban el dinero sin riesgo (ver `BALANCE.md`). Queda una prima de valor pequeña que
  premiará la investigación (Fase 2/5).
- **Valoración prospectiva de dos etapas** (beneficio anualizado del último trimestre, margen
  medio entre actual y estructural, crecimiento propio 3 años + 2,5 % perpetuo) en vez de PER
  sobre 12 meses: elimina derivas predecibles tras los resultados.
- **Bancarrota** tras 3 meses por debajo del límite de descubierto o 3 cuotas impagadas (no por
  un bache puntual): el impuesto de enero sin liquidez avisa antes de arruinar.
- **Recesiones con avisos**: el cambio de fase se decide 3–6 meses antes y se filtra por la curva
  de tipos, el PMI y noticias sutiles.

## Fase 0 — Cimientos ✅
- [x] Vite + TypeScript estricto + React + Zustand, estructura de carpetas del documento.
- [x] `CLAUDE.md`, `PLAN.md`, `ASSETS.md`, `README.md`.
- [x] ESLint (con reglas de determinismo en la economía), Prettier, `npm run check` como CI local.
- [x] Vitest y Playwright configurados (Chromium preinstalado).
- [x] Pantalla de arranque: horizonte procedural animado, menú, ajustes de accesibilidad.

## Fase 1 — Motor de simulación económica ✅
- [x] RNG determinista por flujos, calendario (festivos, horario bursátil), libro de partida doble.
- [x] 6 países ficticios: PIB, inflación, paro, deuda, PMI, divisa, IPC; ciclo global de 4 fases
      con avisos adelantados; bancos centrales con regla de Taylor gradual; petróleo; burbujas.
- [x] Eventos sistémicos raros (crisis bancaria, pandemia, guerra comercial, shock petrolero,
      estallido tecnológico) con correlaciones que se disparan.
- [x] 50 empresas procedurales con fundamentales, resultados trimestrales con consenso y
      sorpresas, dividendos, avisos de beneficios, fraudes ocultos, ampliaciones, quiebras, OPA,
      splits y salidas a bolsa que reponen el mercado.
- [x] Microestructura: diferencial por capitalización, impacto de mercado (ley de raíz cuadrada)
      con parte permanente y temporal, órdenes a mercado/límite, cola fuera de horario.
- [x] Bonos soberanos (8 plazos × 6 países) y corporativos: curva de tipos, rating, cupones,
      duración, amortización e impagos con recuperación.
- [x] Banca: cuenta corriente con descubierto, remunerada, depósitos, préstamos personales con
      scoring y regla del 35 %.
- [x] Fiscalidad: retenciones del 19 %, IRPF del ahorro por tramos anual, compensación de pérdidas.
- [x] Noticias: resultados, macro, bancos centrales, análisis contradictorios, rumores falsos que
      se desmienten, escándalos, señales de recesión y de burbuja.
- [x] Cuaderno del inversor: 21 conceptos que se desbloquean al vivirlos.
- [x] Tests: determinismo (misma semilla, guardar/cargar, aislamiento del azar), invariantes
      (jugador caótico 3 años, mundo 10 años), operativa sin arbitraje, banca, balance con 7 bots.
- [x] Consola 2D de depuración/juego: mercados, macro, acciones, bonos, banco, cartera,
      noticias, ficha de empresa con gráfico y ticket, modo depuración con información oculta.
- [x] Worker de simulación, guardado en IndexedDB con ranuras, autoguardado, copia de seguridad,
      migraciones y exportar/importar.

## Fase 2 — Catálogo masivo de inversiones ✅
- [x] Marco genérico de instrumento (`src/investments`): precio por factores comunes
      (bolsa, sectores, tipos, inflación, divisas, 12 materias primas, cripto, 10 barrios,
      lujo, capital riesgo, electricidad, modas del coleccionismo) + ruido propio, renta,
      información visible y oculta. Cada clase aporta sus reglas (`classes/`).
- [x] 21 clases nuevas que cubren las 20 del documento: ETF (índices, sectores, temáticos,
      bonos, materias primas, apalancados), fondos activos, planes de pensiones, seguros de
      ahorro/rentas/bonos catástrofe, cripto (majors, DeFi, memecoins, stablecoins), materias
      primas (certificados y metal físico), divisas, opciones, futuros, CFD y forex apalancado,
      inmuebles (11 tipos × 10 barrios), embargos y lotes de liquidación, negocios locales,
      franquicias, startups, tierra agrícola, energía, coleccionismo (10 tipos), cine/música/
      deporte, préstamos P2P y microcréditos, filantropía.
- [x] ≥ 5.000 instrumentos al empezar (≈ 5.300) y oportunidades nuevas cada semana que caducan;
      el catálogo se mantiene > 5.000 durante toda la partida.
- [x] Información oculta descubrible con investigación de 3 niveles (coste y días), con
      estimaciones deterministas que mejoran con el nivel.
- [x] Liquidez realista por clase: al instante, a valor liquidativo de las 18:00, subasta
      semanal, venta anunciada (semanas) o rápida con descuento, secundario con descuento.
- [x] Comisiones, diferenciales, ITP, notaría, agencia, custodia, IBI, comunidad; rentas con
      retención; deducciones (pensiones, donativos); hipotecas con límite de esfuerzo y ejecución.
- [x] Derivados con test de conveniencia: opciones Black-Scholes (pérdida limitada), futuros y
      CFD con garantía, liquidación diaria, financiación, llamadas de margen y cierre forzoso.
- [x] Eventos por clase: impagos de inquilinos, licencias turísticas, sequías y granizo, recortes
      regulatorios, tirones de alfombra y hackeos, pérdidas de paridad, falsificaciones,
      rondas y fracasos de startups (algunas salen a bolsa), escándalos de franquicias,
      catástrofes, lesiones, estrenos.
- [x] 29 conceptos nuevos en el Cuaderno del inversor (50 en total).
- [x] UI: explorador por clases con filtros y paginación en el worker, ficha de instrumento con
      investigación, hipoteca, modos de venta y posiciones apalancadas; test de derivados;
      cartera con alternativas.
- [x] Herramienta de inspección: `npm run catalog -- <semilla> <años> [--clase id] [--csv f]`.
- [x] Tests: tamaño y determinismo del catálogo, migración v1→v2, operativa sin arbitraje en
      todas las clases, hipoteca completa, margen, opciones, investigación, deducciones,
      jugador caótico 2 años, balance con 5 bots del catálogo.

**Decisiones de la Fase 2**
- **Valor liquidativo de las 18:00** para todo lo que no cotiza en vivo (fondos, cripto,
  materias primas, inmuebles…): las órdenes se ejecutan al siguiente cierre. Evita que el
  jugador compre a un precio viejo sabiendo cómo se ha movido el mercado por la tarde.
- **Opciones valoradas solo al consultarlas o tenerlas**: 1.300 opciones con Black-Scholes a
  diario costaban más que toda la bolsa.
- **Oportunidades con caducidad** en vez de un catálogo fijo: el mundo se siente vivo y el
  tamaño del estado se mantiene acotado.
- **Filantropía fuera del patrimonio**: donar no es invertir, pero desgrava y da reputación
  (base para las facciones de la Fase 8).
- Los negocios propios gestionados (Fase 7) se apoyan en `businessRules`: hoy el jugador es
  socio capitalista; mañana, dueño.

**Pendiente de rendimiento** (Fase 11): la simulación completa cuesta ≈ 0,5 s por año de juego
(0,12 s sin catálogo). Plan: simulación por niveles de detalle (instrumentos lejanos a paso
mensual) y generación perezosa de oportunidades.

## Fase 3 — Render 3D base y jugador (siguiente)

## Fases 4–12
Pendientes según el documento maestro: ciudad viva (4), teléfono y UI
financiera (5), vida diaria y niveles 1–3 (6), negocios (7), rivales y narrativa (8), niveles
altos (9), calidad AAA (10), pulido y balance (11), empaquetado (12).

## Deuda conocida
- `CompanyRow.marketCap` se expresa en millones de ₳; los fundamentales en millones de divisa local.
- Los orígenes alternativos del personaje y la segunda oportunidad tras la bancarrota llegan en la
  Fase 6 (hoy la bancarrota congela la partida).
- Localización EN: los textos de UI aún están en español en los componentes (Fase 11 → i18n).
