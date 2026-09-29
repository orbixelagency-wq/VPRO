import { useState } from 'react';
import { money, pct } from '../format';
import { getClient, useGame } from '../store';

function useRun() {
  const pushToast = useGame((s) => s.pushToast);
  return async (cmd: Parameters<ReturnType<typeof getClient>['command']>[0]) => {
    const r = await getClient().command(cmd);
    pushToast({
      kind: r.ok ? 'good' : 'bad',
      title: r.ok ? 'Banco Atalaya' : 'Operación rechazada',
      body: r.message,
    });
    return r.ok;
  };
}

export function BankPanel() {
  const v = useGame((s) => s.view!);
  const p = v.player;
  const run = useRun();
  const [move, setMove] = useState('100');
  const [dep, setDep] = useState('500');
  const [months, setMonths] = useState(12);
  const [loan, setLoan] = useState('1000');
  const [loanMonths, setLoanMonths] = useState(24);
  const amount = (s: string) => Math.max(0, Number(s.replace(',', '.')) || 0);

  return (
    <div className="bank">
      <div className="bank-cards">
        <div className="account">
          <div className="eyebrow">Cuenta corriente</div>
          <div className={`account-balance mono ${p.cash < 0 ? 'down' : ''}`}>{money(p.cash)}</div>
          <p className="faint small">
            Sin intereses. Descubierto permitido hasta −500 ₳ al 18 % anual + 15 ₳ de comisión
            mensual.
          </p>
        </div>
        <div className="account">
          <div className="eyebrow">Cuenta remunerada</div>
          <div className="account-balance mono">{money(p.savings)}</div>
          <p className="faint small">
            {pct(v.rates.savings)} TAE, se paga cada mes (retención del 19 %). Disponible al
            momento.
          </p>
          <div className="inline-form">
            <input
              className="mono"
              value={move}
              onChange={(e) => setMove(e.target.value)}
              aria-label="Importe"
            />
            <button
              className="btn sm"
              onClick={() => run({ type: 'toSavings', amount: amount(move) })}
            >
              Ingresar
            </button>
            <button
              className="btn sm"
              onClick={() => run({ type: 'fromSavings', amount: amount(move) })}
            >
              Retirar
            </button>
          </div>
        </div>
        <div className="account">
          <div className="eyebrow">Depósitos a plazo</div>
          <div className="account-balance mono">{money(p.deposits)}</div>
          <div className="rate-strip">
            {Object.entries(v.rates.deposits).map(([m, r]) => (
              <button
                key={m}
                className={`rate ${Number(m) === months ? 'active' : ''}`}
                onClick={() => setMonths(Number(m))}
              >
                <span>{m} m</span>
                <b className="mono">{pct(r)}</b>
              </button>
            ))}
          </div>
          <div className="inline-form">
            <input
              className="mono"
              value={dep}
              onChange={(e) => setDep(e.target.value)}
              aria-label="Importe del depósito"
            />
            <button
              className="btn sm gold"
              onClick={() => run({ type: 'openDeposit', amount: amount(dep), months })}
            >
              Contratar a {months} meses
            </button>
          </div>
          {p.depositList.map((d) => (
            <div key={d.id} className="line-item">
              <span className="mono">{money(d.principal)}</span>
              <span className="muted">
                al {pct(d.rate)} · vence {d.maturity}
              </span>
              <button
                className="btn ghost sm"
                onClick={() => run({ type: 'breakDeposit', depositId: d.id })}
                title="Pierdes los intereses y pagas un 0,5 %"
              >
                Cancelar
              </button>
            </div>
          ))}
        </div>
        <div className="account">
          <div className="eyebrow">Préstamos personales</div>
          <div className="account-balance mono">{p.debt > 0 ? `−${money(p.debt)}` : money(0)}</div>
          <p className="faint small">
            Tipo actual {pct(v.rates.loan)} · te conceden hasta{' '}
            <b className="mono">{money(v.rates.maxLoan, 0)}</b> (las cuotas no pueden superar el 35
            % de tu nómina).
          </p>
          <div className="inline-form">
            <input
              className="mono"
              value={loan}
              onChange={(e) => setLoan(e.target.value)}
              aria-label="Importe del préstamo"
            />
            <select
              value={loanMonths}
              onChange={(e) => setLoanMonths(Number(e.target.value))}
              aria-label="Plazo"
            >
              {[12, 24, 36, 48, 60].map((m) => (
                <option key={m} value={m}>
                  {m} meses
                </option>
              ))}
            </select>
            <button
              className="btn sm"
              onClick={() => run({ type: 'takeLoan', amount: amount(loan), months: loanMonths })}
            >
              Solicitar
            </button>
          </div>
          {p.loans.map((l) => (
            <div key={l.id} className="line-item">
              <span className="mono">{money(l.outstanding)}</span>
              <span className="muted">
                {pct(l.rate)} · cuota {money(l.monthlyPayment)} · {l.monthsLeft} meses{' '}
                {l.missed > 0 ? <b className="down">· {l.missed} impagos</b> : null}
              </span>
              <button
                className="btn ghost sm"
                onClick={() =>
                  run({
                    type: 'repayLoan',
                    loanId: l.id,
                    amount: Math.max(0, Math.min(l.outstanding, p.cash)),
                  })
                }
              >
                Amortizar
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="journal">
        <div className="eyebrow">Últimos movimientos</div>
        <table className="data">
          <tbody>
            {p.journal.map((j, i) => (
              <tr key={i}>
                <td className="faint mono small">{j.date}</td>
                <td>{j.memo}</td>
                <td className={`r mono ${j.amount > 0 ? 'up' : j.amount < 0 ? 'down' : 'faint'}`}>
                  {j.amount === 0 ? 'interno' : money(j.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
