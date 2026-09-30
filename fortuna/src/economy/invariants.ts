import { ACCOUNT_IDS, ledgerSum } from './ledger';
import type { SimState } from './types';

/**
 * Comprueba las invariantes de la simulación. Devuelve la lista de violaciones
 * (vacía si todo es correcto). Se usa en tests y en el modo depuración.
 */
export function checkInvariants(state: SimState): string[] {
  const errors: string[] = [];
  const sum = ledgerSum(state.ledger);
  if (sum !== 0) errors.push(`El dinero no se conserva: suma del libro = ${sum}`);
  for (const id of ACCOUNT_IDS) {
    const b = state.ledger.balances[id];
    if (!Number.isInteger(b)) errors.push(`Saldo no entero en ${id}: ${b}`);
  }
  const depSum = state.player.deposits.reduce((a, d) => a + d.principal, 0);
  if (depSum !== state.ledger.balances['player:deposits'])
    errors.push(`Depósitos descuadrados: ${depSum} vs ${state.ledger.balances['player:deposits']}`);
  if (state.ledger.balances['player:savings'] < 0) errors.push('Cuenta remunerada negativa');
  for (const c of state.companies) {
    if (!(c.price > 0) || !Number.isFinite(c.price))
      errors.push(`Precio no válido en ${c.id}: ${c.price}`);
    if (!Number.isFinite(c.fairValue)) errors.push(`Valor razonable no válido en ${c.id}`);
    if (!(c.sharesOutstanding > 0)) errors.push(`Acciones no válidas en ${c.id}`);
    if (!Number.isFinite(c.sentiment)) errors.push(`Sentimiento no válido en ${c.id}`);
  }
  for (const b of state.bonds) {
    if (!(b.price >= 0) || !Number.isFinite(b.price))
      errors.push(`Precio de bono no válido en ${b.id}: ${b.price}`);
  }
  for (const [id, h] of Object.entries(state.player.stocks)) {
    if (!(h.qty > 0) || !Number.isInteger(h.qty))
      errors.push(`Posición no válida en ${id}: ${h.qty}`);
  }
  for (const [id, h] of Object.entries(state.player.bonds)) {
    if (!(h.qty > 0) || !Number.isInteger(h.qty))
      errors.push(`Posición de bono no válida en ${id}: ${h.qty}`);
  }
  for (const l of state.player.loans)
    if (l.outstanding < 0) errors.push(`Préstamo negativo #${l.id}`);
  for (const ct of state.countries) {
    for (const [k, v] of Object.entries({ fx: ct.fx, cpi: ct.cpi, gdp: ct.gdp }))
      if (!(v > 0) || !Number.isFinite(v)) errors.push(`${ct.id}.${k} no válido: ${v}`);
    for (const [k, v] of Object.entries({
      rate: ct.policyRate,
      infl: ct.inflation,
      g: ct.gdpGrowth,
    }))
      if (!Number.isFinite(v)) errors.push(`${ct.id}.${k} no finito`);
    if (ct.policyRate < 0) errors.push(`${ct.id}: tipo oficial negativo`);
  }
  if (state.inv) {
    const ids = new Set<string>();
    for (const i of state.inv.instruments) {
      if (ids.has(i.id)) errors.push(`Instrumento duplicado: ${i.id}`);
      ids.add(i.id);
      if (!(i.price >= 0) || !Number.isFinite(i.price))
        errors.push(`Precio no válido en ${i.id} (${i.cls}): ${i.price}`);
    }
    let margin = 0;
    for (const [id, pos] of Object.entries(state.inv.positions)) {
      if (!ids.has(id)) errors.push(`Posición sobre un instrumento inexistente: ${id}`);
      if (!Number.isFinite(pos.qty) || pos.qty === 0 || !Number.isInteger(pos.qty))
        errors.push(`Posición no válida en ${id}: ${pos.qty}`);
      if (pos.margin !== undefined) margin += pos.margin;
      else if (pos.qty < 0) errors.push(`Posición corta sin margen en ${id}`);
    }
    if (margin !== state.ledger.balances['player:margin'])
      errors.push(`Garantías descuadradas: ${margin} vs ${state.ledger.balances['player:margin']}`);
  }
  for (const idx of state.indices)
    if (!(idx.value > 0) || !Number.isFinite(idx.value))
      errors.push(`Índice ${idx.id} no válido: ${idx.value}`);
  return errors;
}
