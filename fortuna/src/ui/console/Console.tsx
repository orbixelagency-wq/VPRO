import { useEffect } from 'react';
import { useGame, type Tab } from '../store';
import { BankPanel } from './BankPanel';
import { BondsTable } from './BondsTable';
import { CompanyPanel } from './CompanyPanel';
import { Explorer } from './Explorer';
import { InstrumentPanel } from './InstrumentPanel';
import { QuizModal } from './QuizModal';
import { IndicesCard, PulseCard, WealthCard } from './LeftColumn';
import { MacroPanel } from './MacroPanel';
import { NewsFeed } from './NewsFeed';
import { NotebookModal } from './NotebookModal';
import { PortfolioPanel } from './PortfolioPanel';
import { StocksTable } from './StocksTable';
import { TopBar } from './TopBar';

const TABS: { id: Tab; label: string }[] = [
  { id: 'explore', label: 'Explorar' },
  { id: 'stocks', label: 'Acciones' },
  { id: 'bonds', label: 'Bonos' },
  { id: 'bank', label: 'Banco' },
  { id: 'portfolio', label: 'Cartera' },
  { id: 'macro', label: 'Macro' },
];

const AUTOSAVE_MS = 90_000;

export function Console() {
  const tab = useGame((s) => s.tab);
  const setTab = useGame((s) => s.setTab);
  const bankrupt = useGame((s) => s.view!.player.bankrupt);
  const holdings = useGame((s) => s.view!.player.holdings.length + s.view!.catalogHoldings.length);
  const focus = useGame((s) => s.focus);

  // Atajos de teclado: espacio pausa, 1–5 velocidades, N cuaderno, º depuración.
  useEffect(() => {
    let resume = 1;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA'
      )
        return;
      const s = useGame.getState();
      if (e.code === 'Space') {
        e.preventDefault();
        if (s.speedIndex > 0) {
          resume = s.speedIndex;
          s.setSpeed(0);
        } else s.setSpeed(resume);
      } else if (/^[1-5]$/.test(e.key)) s.setSpeed(Number(e.key));
      else if (e.key.toLowerCase() === 'n') {
        if (s.notebookOpen) s.closeNotebook();
        else s.openNotebook();
      } else if (e.key === 'º' || e.key === '`') s.toggleDebug();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      useGame
        .getState()
        .saveNow()
        .catch(() => undefined);
    }, AUTOSAVE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="console grain">
      <TopBar />
      {bankrupt && (
        <div className="banner bad full">
          Bancarrota personal. El banco ha ejecutado tus deudas. (La mecánica de segunda oportunidad
          y legado llega en la fase 6.)
        </div>
      )}
      <main className="grid">
        <div className="col left">
          <WealthCard />
          <PulseCard />
          <IndicesCard />
        </div>
        <div className="col center">
          <section className="panel main-panel">
            <div className="panel-head">
              <nav className="tabs" aria-label="Secciones">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    className={`tab ${tab === t.id ? 'active' : ''}`}
                    onClick={() => setTab(t.id)}
                    aria-current={tab === t.id}
                  >
                    {t.label}
                    {t.id === 'portfolio' && holdings > 0 ? (
                      <span className="tab-count">{holdings}</span>
                    ) : null}
                  </button>
                ))}
              </nav>
            </div>
            <div className="main-body">
              {tab === 'explore' && <Explorer />}
              {tab === 'stocks' && <StocksTable />}
              {tab === 'bonds' && <BondsTable />}
              {tab === 'bank' && (
                <div className="panel-body">
                  <BankPanel />
                </div>
              )}
              {tab === 'portfolio' && (
                <div className="panel-body">
                  <PortfolioPanel />
                </div>
              )}
              {tab === 'macro' && (
                <div className="panel-body">
                  <MacroPanel />
                </div>
              )}
            </div>
          </section>
          <NewsFeed />
        </div>
        <div className="col right">
          {focus === 'instrument' ? <InstrumentPanel /> : <CompanyPanel />}
        </div>
      </main>
      <NotebookModal />
      <QuizModal />
    </div>
  );
}
