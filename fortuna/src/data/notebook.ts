/**
 * Cuaderno del inversor: conceptos que se desbloquean la primera vez que el jugador
 * los vive en la partida. Texto breve, con ejemplo y moraleja.
 */
export interface NotebookEntry {
  id: string;
  title: string;
  titleEn: string;
  summary: string;
  lesson: string;
}

export const NOTEBOOK: readonly NotebookEntry[] = [
  {
    id: 'interes_compuesto',
    title: 'Interés compuesto',
    titleEn: 'Compound interest',
    summary:
      'Los intereses que cobras empiezan a generar sus propios intereses. Al 7 % anual, el dinero se duplica en unos 10 años.',
    lesson:
      'El tiempo es el ingrediente más potente: empieza pronto y no interrumpas la bola de nieve.',
  },
  {
    id: 'inflacion',
    title: 'Inflación',
    titleEn: 'Inflation',
    summary:
      'Los precios suben con el tiempo. El dinero parado en la cuenta corriente compra cada año un poco menos.',
    lesson:
      'Si tu dinero rinde menos que la inflación, te estás empobreciendo aunque el saldo no baje.',
  },
  {
    id: 'comisiones',
    title: 'Comisiones',
    titleEn: 'Fees',
    summary:
      'Cada operación cuesta: comisión del bróker, diferencial entre compra y venta y, en órdenes grandes, impacto en el precio.',
    lesson:
      'Operar mucho enriquece al intermediario. Las comisiones pequeñas, repetidas, se comen la rentabilidad.',
  },
  {
    id: 'spread',
    title: 'Diferencial (spread)',
    titleEn: 'Bid-ask spread',
    summary:
      'Siempre compras un poco más caro y vendes un poco más barato que el precio de mercado. En empresas pequeñas el diferencial es mayor.',
    lesson: 'Comprar y vender inmediatamente siempre pierde dinero.',
  },
  {
    id: 'impacto_mercado',
    title: 'Impacto de mercado',
    titleEn: 'Market impact',
    summary:
      'Si compras una cantidad grande comparada con lo que se negocia al día, empujas tú mismo el precio en tu contra.',
    lesson: 'Las posiciones grandes se construyen poco a poco, o se pagan caras.',
  },
  {
    id: 'diversificacion',
    title: 'Diversificación',
    titleEn: 'Diversification',
    summary:
      'Repartir el dinero entre muchas empresas, sectores y países reduce el riesgo de que un solo golpe te hunda.',
    lesson:
      'Es lo más parecido a un almuerzo gratis que existe en las finanzas… salvo en las crisis, cuando todo cae a la vez.',
  },
  {
    id: 'dividendo',
    title: 'Dividendo',
    titleEn: 'Dividend',
    summary:
      'Parte del beneficio que la empresa reparte en efectivo a sus accionistas, normalmente cada trimestre.',
    lesson: 'Reinvertir los dividendos es una de las formas más sencillas de interés compuesto.',
  },
  {
    id: 'retencion',
    title: 'Retención fiscal',
    titleEn: 'Withholding tax',
    summary:
      'Hacienda se queda un 19 % de dividendos e intereses en el momento del pago, a cuenta del impuesto anual.',
    lesson: 'La rentabilidad que importa es la neta, después de impuestos.',
  },
  {
    id: 'impuestos',
    title: 'Impuesto sobre ganancias',
    titleEn: 'Capital gains tax',
    summary:
      'Las ganancias al vender se suman durante el año y tributan en enero por tramos (19 %–27 %). Las pérdidas compensan ganancias futuras.',
    lesson: 'No vender también es una decisión fiscal: mientras no vendes, no tributas.',
  },
  {
    id: 'deposito',
    title: 'Depósito a plazo',
    titleEn: 'Term deposit',
    summary:
      'Prestas tu dinero al banco durante un plazo fijo a cambio de un interés garantizado. Cancelarlo antes tiene penalización.',
    lesson: 'Seguro y aburrido: ideal para el dinero que vas a necesitar pronto.',
  },
  {
    id: 'prestamo',
    title: 'Préstamo y apalancamiento',
    titleEn: 'Loans and leverage',
    summary:
      'Invertir con dinero prestado multiplica las ganancias… y las pérdidas. La cuota hay que pagarla pase lo que pase.',
    lesson: 'El apalancamiento convierte una mala racha en una ruina.',
  },
  {
    id: 'descubierto',
    title: 'Descubierto',
    titleEn: 'Overdraft',
    summary:
      'Gastar más de lo que tienes en la cuenta corriente. El banco lo cobra muy caro: 18 % anual más comisiones.',
    lesson: 'Es la deuda más cara que tendrás. Sal de ella cuanto antes.',
  },
  {
    id: 'bono_precio_tipos',
    title: 'Bonos y tipos de interés',
    titleEn: 'Bonds and rates',
    summary:
      'Cuando los tipos suben, los bonos que ya existen valen menos (y al revés). Cuanto más largo es el bono, más se mueve.',
    lesson:
      'Un bono es seguro si lo mantienes hasta el vencimiento y el emisor paga; su precio intermedio puede oscilar bastante.',
  },
  {
    id: 'impago',
    title: 'Impago',
    titleEn: 'Default',
    summary: 'Si el emisor quiebra, deja de pagar cupones y devuelve solo una parte del nominal.',
    lesson: 'Un cupón alto suele ser un aviso: te pagan por asumir riesgo.',
  },
  {
    id: 'opa',
    title: 'OPA',
    titleEn: 'Takeover bid',
    summary:
      'Alguien ofrece comprar toda la empresa a un precio fijo, normalmente con prima. El precio de la acción salta hacia la oferta.',
    lesson: 'Los rumores de OPA son a menudo falsos. Las OPA reales se anuncian oficialmente.',
  },
  {
    id: 'quiebra',
    title: 'Quiebra',
    titleEn: 'Bankruptcy',
    summary:
      'La empresa no puede pagar sus deudas. Los accionistas son los últimos en cobrar: casi siempre pierden todo.',
    lesson:
      'Vigila la deuda y los beneficios. Una acción que ha caído un 90 % todavía puede caer un 100 %.',
  },
  {
    id: 'dilucion',
    title: 'Dilución',
    titleEn: 'Dilution',
    summary:
      'Cuando la empresa emite acciones nuevas, cada acción existente representa una parte más pequeña del negocio.',
    lesson: 'Las ampliaciones de capital con descuento suelen señalar problemas financieros.',
  },
  {
    id: 'split',
    title: 'Split',
    titleEn: 'Stock split',
    summary:
      'La empresa divide cada acción en varias. Tienes más acciones, cada una vale menos, y tu patrimonio no cambia.',
    lesson: 'Un split no crea valor por sí mismo.',
  },
  {
    id: 'rumor',
    title: 'Rumores y noticias falsas',
    titleEn: 'Rumors',
    summary:
      'No todo lo que se publica es cierto. Algunos rumores se desmienten días después y el precio vuelve atrás.',
    lesson: 'Compra el rumor, vende la noticia… o, mejor, no operes sobre rumores.',
  },
  {
    id: 'divisa',
    title: 'Riesgo de divisa',
    titleEn: 'Currency risk',
    summary:
      'Las acciones extranjeras cotizan en su moneda. Si esa moneda cae frente al áureo, pierdes aunque la acción suba.',
    lesson: 'Invertir fuera diversifica, pero añade un riesgo más.',
  },
  {
    id: 'ciclo',
    title: 'Ciclo económico',
    titleEn: 'Business cycle',
    summary:
      'La economía alterna expansión, sobrecalentamiento, recesión y recuperación. Los beneficios y los tipos siguen el ciclo.',
    lesson:
      'Las recesiones llegan con avisos: curva de tipos invertida, PMI a la baja, crédito que se endurece.',
  },
];
