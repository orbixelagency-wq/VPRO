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

## Fase 3 — Render 3D base y jugador ✅
- **Renderer** (`engine/renderer.ts`): Three.js r184 `WebGPURenderer` con WebGL2 automático si no
  hay WebGPU, más un segundo respaldo: si WebGPU arranca pero falla al dibujar, el mundo se
  recrea en WebGL2 sin perder la partida. Tone mapping ACES, sombras PCF suaves, bloom TSL en
  Alto/Ultra. Presets Bajo/Medio/Alto/Ultra (`engine/quality.ts`: sombras, distancia de
  dibujado, tope de píxeles hasta 3× para 4K, luces de farola, antialias).
- **Resolución dinámica**: ventanas de 750 ms; baja un 10 % si el fotograma pasa de 18,7 ms y
  recupera un 3 % cuando sobra margen (mínimo 50 %). Panel de rendimiento con `F3`.
- **Ciudad procedural** (`world/cityGen.ts`, pura y testeada): retícula de avenidas (18 m) y
  calles (11 m), 256 manzanas y ~1.470 edificios en los diez barrios con estilos propios
  (`world/districtStyle.ts`: manzanas con patio, torres con zócalo, naves, villas, adosados,
  huertas, parques y plazas con fuente), 3.700 elementos urbanos (farolas, árboles, bancos).
  Se genera en ~20 ms con la semilla de la partida.
- **Mallas** (`world/cityMesh.ts`): edificios fusionados por tesela de 400 m × estilo de fachada
  (~700 draw calls en Medio), texturas de fachada generadas en canvas con ventanas iluminadas de
  noche (`world/textures.ts`), mobiliario instanciado.
- **Entorno** (`world/environment.ts` + `world/sun.ts`): sol astronómico a 39° N (días largos en
  verano), cielo físico con nubes, luna, estrellas, niebla por hora, ventanas y farolas que se
  encienden al anochecer y un grupo de luces puntuales en las farolas más cercanas.
- **Física y jugador**: Rapier (WASM) con controlador cinemático de personaje (escalones de
  acera, rampas de 50°, salto, pegado al suelo), caminar 1,9 m/s y correr 6,2 m/s, paso fijo de
  1/60 s. Cámara en tercera persona con colisión (incluye copas de árboles como sensores).
  Teclado, ratón (arrastre o puntero bloqueado) y mando.
- **Integración**: la partida arranca en la ciudad; el reloj del mundo es el de la simulación
  (interpolado entre ticks) y la terminal del inversor se abre con `Tab` pausando el mundo.
  La partida empieza a las 10:00. Banner al entrar en cada barrio.
- **Pruebas**: `tests/world` (determinismo de la ciudad, sin edificios sobre calzada, aparición
  en acera libre, farolas fuera de edificios, sol y estaciones, física del jugador) y la prueba de
  humo ahora entra en la ciudad, camina y abre la terminal con `Tab`.

**Decisiones**
- three **0.184** fijado: r186 falla en algunos Chrome con WebGPU (`swizzle` en
  `GPUTextureViewDescriptor`).
- El suelo físico va en teselas de 200 m: un único cuboide de 6 km hacía que el controlador de
  personaje perdiera precisión y el jugador se hundiera.
- El motor 3D se carga de forma perezosa (trozo de ~5 MB con el WASM de Rapier); la interfaz
  inicial pesa ~260 KB.
- `castShadow` del sol nunca cambia (cambiarlo recompila todos los shaders) y la resolución
  dinámica se aplica antes de dibujar (cambiar el tamaño vacía el lienzo): ambos causaban
  fotogramas negros.

**Rendimiento**: medido solo con render por software (SwiftShader, sin GPU): 12–15 fps a 1280×760.
En GPU real el objetivo es 60 fps en Medio a 1080p; la resolución dinámica protege el objetivo.
Siguiente paso (Fase 10): LOD e impostores para edificios lejanos, reducción de draw calls con
`BatchedMesh` y culling por teselas.

## Fase 4 — Ciudad viva ✅
- **Clima** (`economy/weather.ts`, puro y determinista por semilla y hora): mediterráneo, con
  frentes de 2–3 días, tormentas de tarde en verano, nieblas matinales de otoño e invierno,
  nevadas rarísimas, temperatura con ciclo diario y anomalías, suelo que tarda horas en secarse.
  Calibrado: ~6 días de lluvia al mes en invierno, <1 en julio; máximas de 16 °C en enero y
  32 °C en julio. La vista (`SimView.meteo`, `forecast`) trae el tiempo y la previsión de 4 días.
- **Efectos de clima** (`world/weatherFx.ts` + `environment.ts`): lluvia y nieve alrededor de la
  cámara, relámpagos, nubes y cielo gris, niebla densa, asfalto mojado (más oscuro y brillante).
- **Edificios singulares** (`world/landmarks.ts`, datos puros): Bolsa de Valmera (pórtico de
  columnas, frontón y cúpula de cobre), sede del Banco de Valmera (torre de 96 m con corona
  iluminada), Ayuntamiento con torre y **reloj que marca la hora del juego**, Universidad y
  Hospital. Más tu portal en Las Grúas y Ultramarinos La Esquina (toldo, escaparates, rótulo).
  Se dibujan con `world/partsMesh.ts` (piezas fusionadas por material, rótulos con texto).
- **Interiores sin pantalla de carga** (`world/interiors.ts`): tu piso (cama, ordenador, sofá,
  cocina), la tienda, el banco (ventanillas, cajero) y la Bolsa (corro, puestos y **panel de
  cotizaciones con los precios reales de la simulación**). Se entra con `E` y un fundido de
  0,4 s. Horarios reales (`world/hours.ts`): banco de 8 a 15 los laborables, Bolsa los días de
  mercado, tienda todos los días.
- **Acciones**: el ordenador de casa, la ventanilla del banco y la mesa de la Bolsa abren la
  terminal en la pestaña adecuada; la cama duerme hasta las 8:00 (comando `waitUntil`); el
  mostrador vende café, periódico (muestra los titulares del día), bocadillo… (comando
  `purchase`, partida doble contra `world`).
- **Tráfico** (`world/roads.ts`, `world/traffic.ts`): grafo de 270 cruces con carriles por la
  derecha (dos por sentido en avenidas), semáforos de ciclo 40 s con todo rojo de seguridad,
  modelo de conductor inteligente (IDM), giros con curvas de Bézier, reserva del carril de
  destino en los cruces, autobuses por avenidas, taxis y furgonetas. Ceden el paso a peatones y
  al jugador. Densidad según la hora (horas punta a las 8 y a las 18), fin de semana y lluvia.
  Los 14 coches más cercanos tienen cuerpo físico: el jugador choca con ellos.
- **Peatones** (`world/pedestrians.ts`): pasean por las aceras, se paran a mirar escaparates,
  cruzan por los pasos de cebra cuando su semáforo lo permite y esquivan al jugador. Densidad
  por barrio, hora (paseo de la tarde) y clima; con lluvia sacan paraguas. Animación de
  piernas y brazos por instancias (`world/actorsMesh.ts`).
- **Streaming del mundo** (`cityMesh.ts`): teselas de 200 m con versión lejana ligera (una
  llamada de dibujo por estilo) y detallada construida de una en una por fotograma al acercarse
  y liberada al alejarse; mobiliario por teselas de 400 m oculto a distancia; tráfico y
  peatones solo en un radio alrededor del jugador. Radio de detalle por calidad (260–720 m).
- **Pasos de cebra y semáforos** en todos los cruces, con los focos cambiando de color.
- **Audio ambiental** (`audio/ambience.ts`, WebAudio sintetizado): rumor de ciudad, tráfico y
  motor del coche más cercano, lluvia (amortiguada bajo techo), viento, gente, mar, pájaros en
  parques, gaviotas en la costa, truenos con el retraso del sonido, campana de la Bolsa a la
  apertura y al cierre, tono de cada interior y pasos. Volúmenes general, ambiente y efectos en
  Ajustes.
- **HUD**: clima con temperatura y previsión desplegable, aviso de acción con `E` (y motivo si
  está cerrado), nombre del interior, fundido.
- **Pruebas**: `tests/world/life.test.ts` (clima mediterráneo, suelo mojado, edificios
  singulares y puertas, interiores, carriles a la derecha, semáforos sin verdes simultáneos,
  15 min de tráfico sin choques, parada ante peatones y en rojo, peatones que nunca pisan la
  calzada salvo al cruzar ni entran en edificios) y `tests/economy/city.test.ts` (compras,
  dormir, horarios). La prueba de humo entra en casa y sale con `E`.

**Decisiones**
- El clima no vive en `SimState`: es una función pura de (semilla, tick). Así no hay que migrar
  partidas y cualquier sistema (economía, teléfono, mundo) obtiene exactamente el mismo tiempo.
- Tráfico y peatones son visuales y locales (no deterministas con el juego): la economía no
  depende de ellos. Usan `Rng` propio para que las pruebas sean reproducibles.
- Los interiores están lejos de la ciudad (x ≥ 6000) en vez de dentro de los edificios: así no
  hay que vaciar mallas fusionadas, se oculta la ciudad al entrar (rinde más) y la cámara no
  choca con fachadas. La cámara se recoloca sin suavizado al teletransportar.
- La versión lejana de cada tesela usa un solo material por estilo (la tapa muestrea un texel
  de pared): pasó de ~1.300–1.900 a ~300–500 llamadas de dibujo en Medio.

**Falta (fases siguientes)**: coches que el jugador pueda conducir y transporte público usable
(Fase 6), más interiores (restaurantes, oficinas, negocios propios en la Fase 7), eventos
urbanos (manifestaciones, partidos, conciertos: Fase 8), música y radio (Fase 10), el índice
agrícola del catálogo (`inv.weather`) aún no usa el clima nuevo.

## Fases 5–12
Pendientes según el documento maestro: teléfono y UI financiera (5, siguiente), vida diaria y
niveles 1–3 (6), negocios (7), rivales y narrativa (8), niveles altos (9), calidad AAA (10),
pulido y balance (11), empaquetado (12).

## Deuda conocida
- `CompanyRow.marketCap` se expresa en millones de ₳; los fundamentales en millones de divisa local.
- Los orígenes alternativos del personaje y la segunda oportunidad tras la bancarrota llegan en la
  Fase 6 (hoy la bancarrota congela la partida).
- Localización EN: los textos de UI aún están en español en los componentes (Fase 11 → i18n).
