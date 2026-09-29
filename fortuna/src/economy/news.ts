import { findCompany } from './generate';
import { HOURS_PER_DAY } from './calendar';
import { Rng } from './rng';
import type { Company, NewsItem, SimState } from './types';
import { sectorDef } from './valuation';

const NEWS_LIMIT = 300;

/** Número con coma decimal para los textos (los datos se guardan sin formato). */
export function esNum(x: number, decimals = 2): string {
  return x.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export type NewsDraft = Omit<NewsItem, 'id' | 'tick'>;

export function publishNews(state: SimState, draft: NewsDraft): NewsItem {
  const item: NewsItem = { id: state.nextId++, tick: state.tick, ...draft };
  state.news.push(item);
  if (state.news.length > NEWS_LIMIT) state.news.splice(0, state.news.length - NEWS_LIMIT);
  state.outbox.push({
    type: 'news',
    tick: state.tick,
    message: item.headline,
    ref: String(item.id),
  });
  return item;
}

const ANALYST_HOUSES = [
  'Atalaya Research',
  'Monteplata Valores',
  'Crest & Holt',
  'Banca Veloz Markets',
  'Égida Analistas',
  'Lindqvist Equity',
];

/** Notas de analistas: contienen información real con ruido (y a veces se contradicen). */
function analystNote(state: SimState, rng: Rng, c: Company): void {
  const gapToFair = Math.log(c.fairValue / c.price); // >0 infravalorada
  const opinion = gapToFair + rng.gauss() * 0.18;
  const up = opinion > 0;
  const target = c.price * Math.exp(opinion * 0.8);
  const house = rng.pick(ANALYST_HOUSES);
  publishNews(state, {
    category: 'analyst',
    headline: up
      ? `${house} ${opinion > 0.2 ? 'recomienda comprar' : 'mejora su valoración de'} ${c.name}`
      : `${house} ${opinion < -0.2 ? 'recomienda vender' : 'rebaja su valoración de'} ${c.name}`,
    body: `Precio objetivo: ${esNum(target)}. ${
      up
        ? 'El informe destaca el potencial de sus márgenes.'
        : 'El informe cuestiona la sostenibilidad de su crecimiento.'
    } Otras casas de análisis mantienen opiniones dispares.`,
    tags: [c.id],
    tone: Math.max(-0.6, Math.min(0.6, opinion)),
    importance: 1,
  });
  c.sentiment += Math.max(-0.02, Math.min(0.02, opinion * 0.03));
}

/** Rumores: algunos son ciertos, otros falsos y se desmienten más tarde. */
function rumor(state: SimState, rng: Rng, c: Company): void {
  const kind = rng.pick(['takeover', 'scandal', 'contract'] as const);
  let isFalse: boolean;
  let effect: number;
  let headline: string;
  if (kind === 'takeover') {
    isFalse = rng.chance(0.8);
    effect = 0.07;
    headline = `Rumores de OPA sobre ${c.name}: un fondo estaría estudiando la compra`;
  } else if (kind === 'scandal') {
    isFalse = !c.hidden.fraud || rng.chance(0.3);
    effect = -0.08;
    headline = `Un exempleado de ${c.name} denuncia irregularidades contables`;
  } else {
    isFalse = rng.chance(0.5);
    effect = 0.05;
    headline = `${c.name} estaría a punto de cerrar un gran contrato, según fuentes cercanas`;
  }
  c.sentiment += effect;
  publishNews(state, {
    category: 'rumor',
    headline,
    body: 'La información no ha sido confirmada por la compañía. Un portavoz declina hacer comentarios.',
    tags: [c.id, `rumor:${kind}`],
    tone: Math.sign(effect) * 0.5,
    importance: 2,
    hidden: {
      isFalse,
      resolveTick: state.tick + rng.int(4, 18) * HOURS_PER_DAY,
      resolved: false,
      effect,
    },
  });
}

/** Tirada diaria de noticias corporativas aleatorias. */
export function dailyCorporateNews(state: SimState): void {
  const rng = new Rng(state.rng.news);
  const listed = state.companies.filter((c) => c.status === 'listed' && !c.takeover);
  if (listed.length === 0) return;
  if (rng.chance(0.55)) analystNote(state, rng, rng.pick(listed));
  if (rng.chance(0.04)) rumor(state, rng, rng.pick(listed));
}

export interface RumorResolution {
  company: Company;
  kind: string;
  isFalse: boolean;
}

/** Resuelve rumores vencidos. Devuelve los ciertos para que el mundo los ejecute. */
export function resolveRumors(state: SimState): RumorResolution[] {
  const out: RumorResolution[] = [];
  for (const n of state.news) {
    if (
      n.category !== 'rumor' ||
      !n.hidden ||
      n.hidden.resolved ||
      n.hidden.resolveTick > state.tick
    )
      continue;
    n.hidden.resolved = true;
    const c = findCompany(state, n.tags[0] ?? '');
    if (!c || c.status !== 'listed') continue;
    const kind = (n.tags[1] ?? 'rumor:contract').split(':')[1] ?? 'contract';
    if (n.hidden.isFalse) {
      c.sentiment -= n.hidden.effect * 1.2;
      publishNews(state, {
        category: 'corporate',
        headline: `${c.name} desmiente ${kind === 'takeover' ? 'cualquier negociación de compra' : kind === 'scandal' ? 'las acusaciones de irregularidades' : 'el supuesto contrato'}`,
        body: 'La compañía califica la información de "especulación sin fundamento". El valor corrige.',
        tags: [c.id],
        tone: -Math.sign(n.hidden.effect) * 0.4,
        importance: 1,
      });
    } else {
      out.push({ company: c, kind, isFalse: false });
      if (kind === 'contract') {
        c.growth += 0.01;
        c.sentiment += 0.03;
        publishNews(state, {
          category: 'corporate',
          headline: `${c.name} confirma un contrato plurianual`,
          body: 'La empresa eleva sus previsiones de ingresos para los próximos ejercicios.',
          tags: [c.id],
          tone: 0.5,
          importance: 2,
        });
      }
    }
  }
  return out;
}

export function sectorName(id: string): string {
  return sectorDef(id).name;
}
