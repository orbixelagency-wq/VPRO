/** Test de conveniencia para operar con derivados. */
export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export const DERIVATIVES_QUIZ: readonly QuizQuestion[] = [
  {
    q: 'Abres un CFD con apalancamiento 10x y el subyacente cae un 10 %. ¿Qué ocurre?',
    options: [
      'Pierdes un 1 % de tu garantía',
      'Pierdes aproximadamente toda tu garantía',
      'No pierdes nada hasta que cierres',
    ],
    answer: 1,
    why: 'Con 10x, un 10 % del subyacente equivale a un 100 % de la garantía depositada.',
  },
  {
    q: 'Compras una opción call. ¿Cuánto puedes perder como máximo?',
    options: ['La prima pagada', 'Ilimitado', 'El valor de las acciones'],
    answer: 0,
    why: 'Comprando opciones, la pérdida máxima es la prima. Venderlas sin cobertura sí tiene riesgo ilimitado.',
  },
  {
    q: 'Te llega una llamada de margen y no tienes efectivo. ¿Qué hace el bróker?',
    options: [
      'Espera a que el precio se recupere',
      'Cierra tu posición a precio de mercado',
      'Te presta el dinero gratis',
    ],
    answer: 1,
    why: 'Sin garantías suficientes, el bróker liquida la posición, y la pérdida queda materializada.',
  },
  {
    q: 'Mantienes un CFD comprado durante un año. ¿Qué coste tiene, además de la comisión?',
    options: ['Ninguno', 'Financiación diaria sobre el nominal', 'Un impuesto especial'],
    answer: 1,
    why: 'Los CFD cobran intereses cada noche sobre el importe total de la posición, no solo sobre la garantía.',
  },
];
