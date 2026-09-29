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

## Fase 2 — Catálogo masivo de inversiones (siguiente)
- [ ] Marco de "clase de activo" con plantillas paramétricas y reglas propias (precio, riesgo,
      liquidez, comisiones, fiscalidad, eventos).
- [ ] ETFs y fondos (índices, sectoriales, temáticos, gestión activa con tracking error).
- [ ] Materias primas y divisas negociables; cripto ficticias con burbujas y rug pulls.
- [ ] Inmobiliario (pisos, locales, naves, terrenos) por barrio; subastas y embargos.
- [ ] Startups/capital riesgo, préstamos P2P, coleccionismo, agricultura, energía, seguros.
- [ ] Derivados bloqueados por nivel (opciones, futuros, CFD) con riesgo de ruina real.
- [ ] Información oculta descubrible (investigación con coste en tiempo/dinero/contactos).
- [ ] ≥ 5.000 instrumentos al empezar + nuevas oportunidades semanales. Herramienta en `/tools`.
- [ ] Rendimiento: simulación por niveles de detalle (instrumentos inactivos a paso diario/semanal).

## Fases 3–12
Pendientes según el documento maestro: render 3D y jugador (3), ciudad viva (4), teléfono y UI
financiera (5), vida diaria y niveles 1–3 (6), negocios (7), rivales y narrativa (8), niveles
altos (9), calidad AAA (10), pulido y balance (11), empaquetado (12).

## Deuda conocida
- `CompanyRow.marketCap` se expresa en millones de ₳; los fundamentales en millones de divisa local.
- Los orígenes alternativos del personaje y la segunda oportunidad tras la bancarrota llegan en la
  Fase 6 (hoy la bancarrota congela la partida).
- Localización EN: los textos de UI aún están en español en los componentes (Fase 11 → i18n).
