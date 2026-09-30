/**
 * Test de conveniencia para operar con derivados (como exige la normativa real a los
 * bróker). Las preguntas viven en datos; la comprobación, aquí.
 */
import { discoverConcept } from '../economy/notebook';
import { DERIVATIVES_QUIZ } from '../data/quiz';
import type { SimState } from '../economy/types';

export function unlockDerivatives(state: SimState, answers: number[]) {
  const correct = DERIVATIVES_QUIZ.every((q, i) => answers[i] === q.answer);
  if (!correct)
    return {
      ok: false,
      message: 'Alguna respuesta no es correcta. Repasa el Cuaderno y vuelve a intentarlo.',
    };
  state.inv.unlocks.derivatives = true;
  discoverConcept(state, 'margen');
  return { ok: true, message: 'Test superado: ya puedes operar con derivados.' };
}
