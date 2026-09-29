import { useMemo, useState } from 'react';
import type { NewsRow } from '../../economy/view';
import { useGame } from '../store';

const CAT_LABEL: Record<string, string> = {
  earnings: 'Resultados',
  macro: 'Macro',
  central_bank: 'Banco central',
  rumor: 'Rumor',
  scandal: 'Escándalo',
  corporate: 'Empresas',
  market: 'Mercado',
  systemic: 'Última hora',
  analyst: 'Análisis',
};

export function NewsItem({ n, compact = false }: { n: NewsRow; compact?: boolean }) {
  const select = useGame((s) => s.select);
  const companies = useGame((s) => s.view!.companies);
  const tag = n.tags.find((t) => companies.some((c) => c.id === t));
  const tone = n.tone > 0.15 ? 'up' : n.tone < -0.15 ? 'down' : 'flat';
  return (
    <article className={`news ${compact ? 'compact' : ''} imp-${n.importance}`}>
      <div className="news-meta">
        <span className={`news-cat cat-${n.category}`}>{CAT_LABEL[n.category] ?? n.category}</span>
        <span className="faint mono">{n.date}</span>
        {tag && !compact && (
          <button className="chip link" onClick={() => select(tag)}>
            {tag}
          </button>
        )}
        {n.debugFalse !== undefined && (
          <span className={`chip ${n.debugFalse ? 'down' : 'up'}`}>
            {n.debugFalse ? 'falso' : 'cierto'}
          </span>
        )}
        <span className={`news-tone ${tone}`} aria-hidden />
      </div>
      <h4 className="news-head">{n.headline}</h4>
      {!compact && <p className="news-body muted">{n.body}</p>}
    </article>
  );
}

export function NewsFeed() {
  const news = useGame((s) => s.view!.news);
  const [filter, setFilter] = useState<string>('all');
  const rows = useMemo(
    () =>
      filter === 'all'
        ? news
        : news.filter((n) => (filter === 'important' ? n.importance >= 2 : n.category === filter)),
    [news, filter],
  );
  return (
    <section className="panel news-panel">
      <div className="panel-head">
        <span className="panel-title">Diario Valmera</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filtrar noticias"
          className="compact-select"
        >
          <option value="all">Todo</option>
          <option value="important">Destacadas</option>
          <option value="earnings">Resultados</option>
          <option value="macro">Macro</option>
          <option value="central_bank">Bancos centrales</option>
          <option value="rumor">Rumores</option>
          <option value="corporate">Empresas</option>
          <option value="analyst">Análisis</option>
        </select>
      </div>
      <div className="panel-body news-list">
        {rows.slice(0, 50).map((n) => (
          <NewsItem key={n.id} n={n} />
        ))}
      </div>
    </section>
  );
}
