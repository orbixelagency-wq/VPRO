import { HOURS_PER_DAY } from './calendar';
import { roundTo } from './generate';
import { esNum, publishNews } from './news';
import { Rng } from './rng';
import type { CyclePhase, SimState, SystemicShock } from './types';
import { countryDef, homeCountry } from './valuation';

/** Contribución del ciclo global al crecimiento de cada país. */
const PHASE_GROWTH: Record<CyclePhase, number> = {
  expansion: 0.004,
  overheating: 0.011,
  recession: -0.032,
  recovery: 0.012,
};

/** Nivel de miedo al que tiende el mercado en cada fase. */
const PHASE_FEAR: Record<CyclePhase, number> = {
  expansion: 13,
  overheating: 16,
  recession: 28,
  recovery: 19,
};

const NEXT_PHASE: Record<CyclePhase, CyclePhase> = {
  expansion: 'overheating',
  overheating: 'recession',
  recession: 'recovery',
  recovery: 'expansion',
};

/** Duración media de cada fase en meses. */
const PHASE_MEAN_MONTHS: Record<CyclePhase, number> = {
  expansion: 44,
  overheating: 14,
  recession: 11,
  recovery: 16,
};

export const PHASE_LABEL: Record<CyclePhase, string> = {
  expansion: 'Expansión',
  overheating: 'Sobrecalentamiento',
  recession: 'Recesión',
  recovery: 'Recuperación',
};

const SHOCK_LABEL: Record<SystemicShock['kind'], string> = {
  banking_crisis: 'crisis bancaria',
  pandemic: 'pandemia',
  trade_war: 'guerra comercial',
  oil_shock: 'shock petrolero',
  tech_crash: 'estallido tecnológico',
};

function phaseGrowthOffset(state: SimState): number {
  const g = state.global;
  let offset = PHASE_GROWTH[g.phase];
  // Las economías se enfrían antes del cambio de fase: señales adelantadas.
  if (g.nextPhase) {
    const lead = Math.max(0, 1 - g.monthsToNext / 5);
    offset = offset * (1 - lead * 0.6) + PHASE_GROWTH[g.nextPhase] * lead * 0.4;
  }
  if (g.shock) offset -= g.shock.severity * 0.03;
  return offset;
}

/** Paso mensual de la macroeconomía global y de cada país. */
export function stepMacroMonthly(state: SimState): void {
  const rng = new Rng(state.rng.macro);
  const g = state.global;
  g.monthsInPhase++;

  // Ciclo global: se decide el cambio con meses de antelación.
  if (g.nextPhase) {
    g.monthsToNext--;
    if (g.monthsToNext <= 0) {
      const from = g.phase;
      g.phase = g.nextPhase;
      g.nextPhase = null;
      g.monthsInPhase = 0;
      state.outbox.push({
        type: 'phase',
        tick: state.tick,
        message: `${PHASE_LABEL[from]} → ${PHASE_LABEL[g.phase]}`,
      });
      announcePhase(state, g.phase);
    }
  } else {
    const mean =
      PHASE_MEAN_MONTHS[g.phase] / (g.phase === 'expansion' ? state.settings.crisisFrequency : 1);
    const hazard = Math.min(0.5, (g.monthsInPhase / mean) ** 2 / mean);
    if (rng.chance(hazard)) {
      let next = NEXT_PHASE[g.phase];
      // Algunas expansiones terminan directamente en recesión.
      if (g.phase === 'expansion' && rng.chance(0.3)) next = 'recession';
      g.nextPhase = next;
      g.monthsToNext = rng.int(3, 6);
    }
  }

  // Petróleo (Qaravel Light): reversión a la media con saltos.
  const oilTarget = 78 * (g.phase === 'overheating' ? 1.18 : g.phase === 'recession' ? 0.78 : 1);
  const oilShock = g.shock?.kind === 'oil_shock' ? 0.08 : 0;
  g.oil *= Math.exp(0.12 * Math.log(oilTarget / g.oil) + rng.gauss() * 0.075 + oilShock);
  g.oil = Math.min(260, Math.max(18, g.oil));

  // Burbuja: se infla en expansiones tranquilas, se desinfla con el miedo.
  if ((g.phase === 'expansion' || g.phase === 'overheating') && g.fear < 19)
    g.froth += 0.012 + rng.next() * 0.012;
  else g.froth *= 0.85;
  g.froth = Math.min(1.2, Math.max(0, g.froth));

  if (g.shock) {
    g.shock.monthsLeft--;
    g.shock.severity *= 0.88;
    if (g.shock.monthsLeft <= 0) g.shock = null;
  }

  const offset = phaseGrowthOffset(state);
  const home = homeCountry(state);
  for (const c of state.countries) {
    const def = countryDef(c.id);
    const vol = def.macroVol;
    let shockEffect = 0;
    if (g.shock?.kind === 'trade_war' && (c.id === 'kaishan' || c.id === 'columbria'))
      shockEffect -= 0.01 * g.shock.severity;
    if (c.id === 'qaravel') shockEffect += 0.25 * Math.log(g.oil / 78) * 0.1;
    const targetGrowth = def.trendGrowth + def.cycleSensitivity * offset + shockEffect;
    c.gdpGrowth += 0.3 * (targetGrowth - c.gdpGrowth) + rng.gauss() * 0.0035 * vol;
    const gap = c.gdpGrowth - def.trendGrowth;
    const oilEffect = 0.025 * Math.log(g.oil / 78);
    const targetInflation = def.inflationTarget + 0.45 * gap + oilEffect;
    c.inflation += 0.12 * (targetInflation - c.inflation) + rng.gauss() * 0.0018 * vol;
    c.inflation = Math.max(-0.02, Math.min(0.25, c.inflation));
    c.unemployment +=
      -0.03 * gap + 0.04 * (def.naturalUnemployment - c.unemployment) + rng.gauss() * 0.0012;
    c.unemployment = Math.max(0.02, Math.min(0.35, c.unemployment));
    const lead = g.nextPhase === 'recession' ? -3 * Math.max(0, 1 - g.monthsToNext / 6) : 0;
    c.pmi = 50 + gap * 260 + lead + rng.gauss() * 0.8;
    const deficit =
      0.025 +
      0.6 * Math.max(0, c.unemployment - def.naturalUnemployment) +
      (g.shock ? 0.02 * g.shock.severity : 0);
    c.debtToGdp += (deficit - (c.gdpGrowth + c.inflation) * c.debtToGdp) / 12;
    c.debtToGdp = Math.max(0.1, c.debtToGdp);
    c.gdp *= Math.pow(1 + c.gdpGrowth + c.inflation, 1 / 12);
    c.cpi *= Math.pow(1 + c.inflation, 1 / 12);
    const riskOff = Math.max(0, g.fear - 20) / 100;
    c.spread =
      def.baseSpread +
      Math.max(0, c.debtToGdp - 0.9) * 0.022 +
      (def.baseSpread > 0 ? riskOff * def.baseSpread * 3 : 0);
    if (c.id !== home.id) {
      const carry = (0.25 * (c.policyRate - home.policyRate)) / 12;
      const haven = def.baseSpread === 0 ? riskOff * 0.02 : -riskOff * def.macroVol * 0.015;
      const inflDiff = -(c.inflation - home.inflation) / 12;
      c.fx *= Math.exp(carry + haven + inflDiff + rng.gauss() * 0.014 * vol);
    }
    c.history.push({
      day: Math.floor(state.tick / HOURS_PER_DAY),
      gdpGrowth: c.gdpGrowth,
      inflation: c.inflation,
      rate: c.policyRate,
      unemployment: c.unemployment,
    });
    if (c.history.length > 600) c.history.shift();
  }
  // Publicación de datos macro del país de residencia.
  publishMacroData(state, rng);
}

function announcePhase(state: SimState, phase: CyclePhase): void {
  const r = new Rng(state.rng.news);
  const lines: Record<CyclePhase, string[]> = {
    expansion: [
      'La economía encadena trimestres de crecimiento sólido',
      'Los economistas dan por cerrada la recuperación: el empleo tira del consumo',
    ],
    overheating: [
      'Recalentamiento: los precios y los salarios se aceleran',
      'La economía va "demasiado deprisa", advierten los bancos centrales',
    ],
    recession: [
      'Oficial: la economía entra en recesión técnica',
      'Dos trimestres de caída del PIB confirman la recesión',
    ],
    recovery: [
      'Brotes verdes: el PIB vuelve a crecer tras la recesión',
      'La recuperación asoma, aunque el paro sigue alto',
    ],
  };
  publishNews(state, {
    category: 'macro',
    headline: r.pick(lines[phase]),
    body: `Cambio de fase del ciclo económico: ${PHASE_LABEL[phase]}. Los analistas revisan sus previsiones de beneficios y de tipos de interés.`,
    tags: ['castelia'],
    tone: phase === 'recession' ? -0.8 : phase === 'overheating' ? -0.2 : 0.5,
    importance: 3,
  });
}

function publishMacroData(state: SimState, rng: Rng): void {
  const home = homeCountry(state);
  const def = countryDef(home.id);
  const pct = (x: number) => `${esNum(x * 100, 1)} %`;
  const gap = home.gdpGrowth - def.trendGrowth;
  const pmiLine =
    home.pmi < 48
      ? `El PMI manufacturero cae a ${esNum(home.pmi, 1)}: los pedidos se contraen`
      : home.pmi > 54
        ? `El PMI se dispara a ${esNum(home.pmi, 1)}: las fábricas no dan abasto`
        : `El PMI se mantiene en ${esNum(home.pmi, 1)}`;
  publishNews(state, {
    category: 'macro',
    headline: rng.chance(0.5)
      ? `IPC de Castelia: la inflación se sitúa en el ${pct(home.inflation)}`
      : pmiLine,
    body: `Crecimiento anualizado ${pct(home.gdpGrowth)}, paro ${pct(home.unemployment)}, inflación ${pct(home.inflation)}. ${
      gap < -0.01
        ? 'Los datos confirman la debilidad de la economía.'
        : gap > 0.008
          ? 'La economía sigue caliente.'
          : 'Datos en línea con lo esperado.'
    }`,
    tags: [home.id],
    tone: Math.max(-1, Math.min(1, gap * 40 - Math.max(0, home.inflation - 0.035) * 20)),
    importance: 1,
  });
  // Señal sutil: inversión de la curva de tipos.
  const g = state.global;
  if (g.nextPhase === 'recession' && rng.chance(0.55)) {
    publishNews(state, {
      category: 'analyst',
      headline: rng.pick([
        'La curva de tipos se invierte: el bono a 2 años paga más que el de 10',
        'Los transportistas reducen pedidos de camiones por tercer mes consecutivo',
        'Los créditos morosos repuntan en las pymes, según el Banco de Castelia',
        'Los directivos venden acciones propias al ritmo más alto en años',
      ]),
      body: 'Algunos indicadores adelantados que históricamente preceden a las recesiones empiezan a encenderse. La mayoría del mercado sigue optimista.',
      tags: ['castelia'],
      tone: -0.15,
      importance: 1,
    });
  }
  if (g.froth > 0.7 && rng.chance(0.4)) {
    publishNews(state, {
      category: 'analyst',
      headline: rng.pick([
        'Mi peluquero me recomienda acciones tecnológicas: ¿señal de techo?',
        'Las salidas a bolsa sin beneficios baten récords de demanda',
        '"Esta vez es diferente", asegura un gestor estrella',
      ]),
      body: 'Las valoraciones de las empresas de crecimiento están en máximos históricos respecto a sus beneficios.',
      tags: ['tech'],
      tone: 0.1,
      importance: 1,
    });
  }
}

/** Reuniones de política monetaria (regla de Taylor con gradualismo). */
export function stepCentralBanks(state: SimState): void {
  const rng = new Rng(state.rng.macro);
  for (const c of state.countries) {
    if (state.tick < c.nextMeeting) continue;
    c.nextMeeting = state.tick + 42 * HOURS_PER_DAY;
    const def = countryDef(c.id);
    const gap = c.gdpGrowth - def.trendGrowth;
    const taylor =
      def.neutralReal + c.inflation + 0.5 * (c.inflation - def.inflationTarget) + 0.9 * gap;
    const emergency = state.global.fear > 40 || (state.global.shock?.severity ?? 0) > 0.5;
    const maxStep = emergency ? 0.0075 : 0.005;
    let delta = roundTo(
      Math.max(-maxStep, Math.min(maxStep, (taylor - c.policyRate) * 0.6)),
      0.0025,
    );
    if (Math.abs(delta) < 0.0025 && Math.abs(taylor - c.policyRate) > 0.004 && rng.chance(0.5))
      delta = taylor > c.policyRate ? 0.0025 : -0.0025;
    const before = c.policyRate;
    c.policyRate = Math.max(0, roundTo(c.policyRate + delta, 0.0025));
    const moved = c.policyRate - before;
    if (c.id === 'castelia' || c.id === 'columbria' || moved !== 0) {
      const bps = Math.round(moved * 10_000);
      publishNews(state, {
        category: 'central_bank',
        headline:
          bps === 0
            ? `${def.centralBank} mantiene los tipos en el ${esNum(c.policyRate * 100)} %`
            : `${def.centralBank} ${bps > 0 ? 'sube' : 'baja'} los tipos ${Math.abs(bps)} puntos básicos, hasta el ${esNum(c.policyRate * 100)} %`,
        body:
          bps > 0
            ? 'La autoridad monetaria prioriza la lucha contra la inflación. Las hipotecas y los préstamos se encarecerán; los bonos existentes pierden valor.'
            : bps < 0
              ? 'El banco central busca apoyar la actividad. Los depósitos rentarán menos y los bonos existentes se revalorizan.'
              : 'Decisión esperada por el mercado. El comunicado mantiene un tono prudente.',
        tags: [c.id],
        tone: bps > 0 ? -0.3 : bps < 0 ? 0.3 : 0,
        importance: c.id === 'castelia' || bps !== 0 ? 2 : 1,
      });
    }
  }
}

/** Evolución diaria del miedo del mercado y de la prima de riesgo. */
export function stepFearDaily(state: SimState, homeIndexReturn: number): void {
  const rng = new Rng(state.rng.macro);
  const g = state.global;
  const shockFear = g.shock ? g.shock.severity * 24 : 0;
  const target = PHASE_FEAR[g.phase] + shockFear + (g.nextPhase === 'recession' ? 2 : 0);
  g.fear += 0.06 * (target - g.fear) + rng.gauss() * 0.5;
  if (homeIndexReturn < -0.02) g.fear += (-homeIndexReturn - 0.02) * 120;
  if (homeIndexReturn > 0.015) g.fear -= 0.6;
  g.fear = Math.max(9, Math.min(80, g.fear));
  g.equityPremium = 0.042 + (g.fear - 16) * 0.0003 - g.froth * 0.01;
}

/** Posible inicio de un evento sistémico (raro). */
export function maybeStartShock(state: SimState): void {
  const g = state.global;
  if (g.shock) return;
  const rng = new Rng(state.rng.events);
  const f = state.settings.crisisFrequency;
  // ~1 cada 9 años de media, más probable en burbuja o sobrecalentamiento.
  const base = (1 / (9 * 365)) * f * (g.phase === 'overheating' ? 2 : 1);
  const techCrash = g.froth > 0.6 ? (g.froth - 0.6) ** 2 * 0.02 : 0;
  if (!rng.chance(base + techCrash)) return;
  let kind: SystemicShock['kind'];
  if (techCrash > base && rng.chance(0.7)) kind = 'tech_crash';
  else
    kind = rng.pick([
      'banking_crisis',
      'pandemic',
      'trade_war',
      'oil_shock',
      'tech_crash',
    ] as const);
  const severity = rng.range(0.45, 1);
  g.shock = { kind, startedTick: state.tick, monthsLeft: rng.int(5, 14), severity };
  if (kind !== 'oil_shock' && g.phase !== 'recession') {
    g.nextPhase = 'recession';
    g.monthsToNext = rng.int(1, 3);
  }
  if (kind === 'oil_shock') g.oil *= 1.5 + severity * 0.5;
  if (kind === 'tech_crash') g.froth = 0;
  g.fear += 8 + severity * 14;
  const hit: Record<string, number> = {};
  switch (kind) {
    case 'banking_crisis':
      Object.assign(hit, { finance: -0.55, realestate: -0.35, discretionary: -0.15 });
      break;
    case 'pandemic':
      Object.assign(hit, {
        discretionary: -0.4,
        energy: -0.3,
        industrial: -0.2,
        health: 0.15,
        tech: 0.05,
      });
      break;
    case 'trade_war':
      Object.assign(hit, { industrial: -0.25, materials: -0.25, tech: -0.2 });
      break;
    case 'oil_shock':
      Object.assign(hit, { energy: 0.25, discretionary: -0.2, industrial: -0.15 });
      break;
    case 'tech_crash':
      Object.assign(hit, { tech: -0.6, discretionary: -0.2, telecom: -0.15 });
      break;
  }
  for (const c of state.companies) {
    const h = hit[c.sector] ?? -0.05;
    c.sentiment += h * severity;
  }
  publishNews(state, {
    category: 'systemic',
    headline: {
      banking_crisis:
        'Pánico bancario: una entidad mediana suspende pagos y el contagio se extiende',
      pandemic: 'Un nuevo virus obliga a cerrar fronteras y comercios en varios países',
      trade_war: 'Columbria y Kaishan se declaran la guerra arancelaria: aranceles del 40 %',
      oil_shock: 'El Emirato de Qaravel corta la producción: el crudo se dispara',
      tech_crash: 'Se pincha la burbuja: las tecnológicas se desploman en una sesión histórica',
    }[kind],
    body: `Evento sistémico (${SHOCK_LABEL[kind]}). Las correlaciones se disparan: casi todos los activos caen a la vez. Los inversores huyen hacia la liquidez y la deuda de los países más seguros.`,
    tags: ['global'],
    tone: -1,
    importance: 3,
  });
}
