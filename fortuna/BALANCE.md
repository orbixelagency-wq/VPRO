# Guía de balance

La economía se calibra con jugadores automáticos (`src/tools/bots.ts`) que juegan partidas
completas con el mismo sueldo (1.180 ₳) y gastos (890 ₳). Ejecuta:

```
npm run balance -- 8 6     # 8 semillas × 6 años (≈ 50 s)
npm run sim -- 42 10       # informe del mundo: índice, volatilidad, fases, quiebras
```

## Objetivos (verificados en `tests/economy/balance.test.ts`)
| Estrategia | Objetivo |
|---|---|
| Colchón | Pierde poder adquisitivo por la inflación, nunca se arruina |
| Ahorrador (remunerada + depósitos) | ≥ colchón, nunca se arruina |
| Indexador (compra mensual del Áureo 20) | > colchón a medio plazo, sin ruina, caídas de ~40 % en crisis |
| Valor (con análisis imperfecto) | Algo mejor que el índice: premia la investigación, no la garantiza |
| Tendencias | Similar al índice con mucha más dispersión |
| Especulador diario | Destruido por comisiones, diferencial e impacto |
| Temerario apalancado | Ruina ≥ 35 % (hoy ~60 %), con algún ganador ocasional |
| Cualquiera | Nunca más de 25× lo aportado (sin atajos de dinero infinito) |

## Catálogo (Fase 2) — `tests/investments/balance-alt.test.ts`
| Bot | Objetivo |
|---|---|
| Casero con hipoteca | Sin atajos: los costes de compra (≈ 10 %) y de venta (3 %) se comen años de alquiler |
| Especulador cripto | Acaba peor que el colchón (la mayoría de tokens se hunden) |
| Futuros 12x | Ruina o pérdida > 20 % en al menos un cuarto de las partidas |
| P2P diversificado | Nunca se arruina |
| Coleccionista impulsivo | No gana más que el colchón (márgenes del 25–30 % y custodia) |
| Cualquiera | Nunca más de 20× lo aportado |

Principio: **todo lo que se compra y se vende al instante pierde dinero** (test que recorre todas
las clases), y lo que no cotiza en vivo se liquida al precio de las 18:00.

## Calibración del mundo (10 años, varias semillas)
- Índice local: 3–8 % anual en precio (+ ~3 % de dividendos), volatilidad 22–27 %, caídas
  máximas 40–63 % en crisis. Acciones individuales: volatilidad mediana ~35 %.
- 1–2 recesiones por década, 1 evento sistémico cada ~9 años, 1–3 quiebras y ~2 OPA por año.
- Predictibilidad (IC de rango mensual): momentum 6 meses ≈ 0,04, valor ≈ 0,07, reversión a 1
  mes ≈ 0. Referencia: mercados reales 0,02–0,05.

## Palancas principales
| Parámetro | Fichero | Efecto |
|---|---|---|
| `HALF_LIFE_DAYS`, hueco de apertura `0.95` | `market.ts` | Cuánto tarda el precio en reflejar la información |
| Reversión y ruido del sentimiento | `market.ts` (`marketClose`) | Prima de valor / persistencia de burbujas |
| `marketSigma` (miedo → volatilidad) | `market.ts` | Volatilidad del mercado |
| `equityPremium` | `macro.ts` (`stepFearDaily`) | Profundidad de las caídas en crisis |
| `PHASE_MEAN_MONTHS`, `crisisFrequency` | `macro.ts` | Frecuencia de recesiones y crisis |
| Golpes de negocio y `targetMargin` | `companies.ts` | Dispersión entre empresas, quiebras |
| Comisiones, diferencial, impacto | `trading.ts`, `valuation.ts` | Coste de operar |

## Historia de ajustes
1. Volatilidad inicial del 44 % → reducida (prima de riesgo menos sensible al miedo, factores más pequeños).
2. Sin quiebras → márgenes con deriva aleatoria, golpes y golpes de suerte de negocio.
3. Bot "valor" ×2,4: el ruido revertía a un ancla conocida → shocks casi permanentes.
4. Bot "tendencias" ×2,8: el PER sobre 12 meses retrasaba la información → valoración prospectiva
   y hueco de apertura del 95 %.
5. Ruina por el impuesto de enero sin liquidez → bancarrota solo tras 3 meses en descubierto.
