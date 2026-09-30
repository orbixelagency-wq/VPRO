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
  // --- Fase 2: catálogo de inversiones ---
  {
    id: 'informacion_oculta',
    title: 'Información oculta',
    titleEn: 'Hidden information',
    summary:
      'Casi todo activo tiene cosas que no se ven en el anuncio: defectos, fraudes, gestores mediocres. Investigar cuesta dinero y tiempo, pero reduce las sorpresas.',
    lesson: 'Paga por saber antes de comprar lo que no puedes vender fácilmente.',
  },
  {
    id: 'fondos_indexados',
    title: 'Fondos indexados y ETF',
    titleEn: 'Index funds & ETFs',
    summary:
      'Compran todo un índice por una comisión mínima. Nunca ganan al mercado, pero tampoco pierden contra él por mucho.',
    lesson: 'Para la mayoría de la gente, lo aburrido y barato gana a largo plazo.',
  },
  {
    id: 'gestion_activa',
    title: 'Gestión activa',
    titleEn: 'Active management',
    summary:
      'Un gestor elige valores intentando batir al índice. Cobra entre el 1 % y el 2 % al año, y la mayoría no lo consigue tras comisiones.',
    lesson: 'Las estrellas del pasado no garantizan el futuro; las comisiones, sí.',
  },
  {
    id: 'apalancado_diario',
    title: 'ETF apalancados',
    titleEn: 'Leveraged ETFs',
    summary:
      'Multiplican el movimiento diario del índice. Por el reajuste diario, pierden valor con la volatilidad aunque el índice acabe donde empezó.',
    lesson: 'Son herramientas de horas o días, no inversiones para años.',
  },
  {
    id: 'plan_pensiones',
    title: 'Plan de pensiones',
    titleEn: 'Pension plan',
    summary:
      'Aportar desgrava (Hacienda te devuelve el 20 % de hasta 1.500 ₳ al año), pero el dinero queda bloqueado: rescatarlo antes cuesta un 10 %.',
    lesson: 'Ventaja fiscal a cambio de liquidez: úsalo para dinero que no vas a tocar en décadas.',
  },
  {
    id: 'deducciones',
    title: 'Deducciones fiscales',
    titleEn: 'Tax deductions',
    summary:
      'Algunas decisiones reducen tus impuestos: aportar a planes de pensiones o donar a causas benéficas.',
    lesson: 'La optimización fiscal legal es parte de la rentabilidad.',
  },
  {
    id: 'cripto',
    title: 'Criptoactivos',
    titleEn: 'Crypto assets',
    summary:
      'Mercado abierto 24 horas, sin fundamentales que lo anclen y con ciclos de euforia y pánico extremos. La mayoría de tokens acaban valiendo casi cero.',
    lesson: 'Si no sabes quién hay detrás de un token, el producto eres tú.',
  },
  {
    id: 'rug_pull',
    title: 'Tirón de alfombra',
    titleEn: 'Rug pull',
    summary:
      'Los creadores de un token lo inflan, venden todo de golpe y desaparecen con el dinero.',
    lesson:
      'Rentabilidades prometidas del 30 % anual por "staking" suelen ser una señal de alarma.',
  },
  {
    id: 'staking',
    title: 'Staking',
    titleEn: 'Staking',
    summary:
      'Bloquear criptomonedas para validar una red a cambio de una renta. El rendimiento no compensa si el token se hunde.',
    lesson: 'Una renta alta sobre un activo que cae sigue siendo una pérdida.',
  },
  {
    id: 'materias_primas',
    title: 'Materias primas',
    titleEn: 'Commodities',
    summary:
      'Oro, petróleo, cobre, trigo… No pagan rentas: solo ganas si sube el precio. Las mueven la inflación, el ciclo, el miedo y el clima.',
    lesson:
      'El oro protege en las crisis; el cobre anticipa el crecimiento; el trigo depende de la lluvia.',
  },
  {
    id: 'opciones',
    title: 'Opciones',
    titleEn: 'Options',
    summary:
      'Una call da derecho a comprar a un precio fijado; una put, a vender. Pierden valor con el paso del tiempo si el precio no se mueve.',
    lesson: 'La mayoría de opciones compradas vencen sin valor.',
  },
  {
    id: 'margen',
    title: 'Margen y apalancamiento',
    titleEn: 'Margin',
    summary:
      'Con futuros y CFD depositas solo una garantía y controlas una posición mucho mayor. Cada día se liquidan las pérdidas y, si la garantía no alcanza, te cierran la posición.',
    lesson:
      'El apalancamiento no cambia la dirección de la apuesta: cambia lo rápido que te arruinas.',
  },
  {
    id: 'hipoteca',
    title: 'Hipoteca',
    titleEn: 'Mortgage',
    summary:
      'Préstamo a largo plazo con el inmueble como garantía. El banco financia hasta el 80 % y exige que la cuota no supere el 40 % de tus ingresos.',
    lesson:
      'Si dejas de pagar tres cuotas, el banco se queda con la casa y la subasta a precio de saldo.',
  },
  {
    id: 'inmobiliario',
    title: 'Inversión inmobiliaria',
    titleEn: 'Real estate',
    summary:
      'Comprar cuesta un 9–10 % extra (impuestos, notaría) y vender otro 3 %. Tarda semanas en venderse. A cambio, genera alquiler y protege contra la inflación.',
    lesson: 'Un inmueble es un negocio: IBI, comunidad, reparaciones, vacíos e inquilinos.',
  },
  {
    id: 'alquiler',
    title: 'Rentabilidad del alquiler',
    titleEn: 'Rental yield',
    summary:
      'La rentabilidad bruta es el alquiler anual entre el precio. La neta descuenta impuestos, gastos, meses vacíos e impagos: suele ser 2–3 puntos menor.',
    lesson: 'Calcula siempre la neta.',
  },
  {
    id: 'impago_alquiler',
    title: 'Impago del inquilino',
    titleEn: 'Tenant default',
    summary: 'Un inquilino que deja de pagar significa meses sin ingresos, abogados y desahucio.',
    lesson: 'Investiga el inmueble y el barrio: el inquilino importa tanto como el piso.',
  },
  {
    id: 'riesgo_regulatorio',
    title: 'Riesgo regulatorio',
    titleEn: 'Regulatory risk',
    summary:
      'Un cambio de ley puede recortar de golpe lo que gana un activo: licencias turísticas, tarifas de renovables…',
    lesson: 'Lo que depende de una norma puede cambiar con otra norma.',
  },
  {
    id: 'embargo',
    title: 'Embargos y liquidaciones',
    titleEn: 'Distressed assets',
    summary:
      'Se compran muy por debajo de su valor… porque suelen esconder problemas: ocupas, deudas, desperfectos.',
    lesson: 'El descuento es el precio del riesgo. Investiga antes de pujar.',
  },
  {
    id: 'socio_capitalista',
    title: 'Socio capitalista',
    titleEn: 'Silent partner',
    summary:
      'Pones dinero en un negocio ajeno a cambio de una parte de los beneficios. Dependes de la honestidad y el talento del dueño.',
    lesson: 'Una auditoría cuesta poco comparada con un socio que maquilla las cuentas.',
  },
  {
    id: 'franquicia',
    title: 'Franquicias',
    titleEn: 'Franchises',
    summary:
      'Un modelo probado a cambio de un canon y royalties. Menos riesgo que un negocio nuevo, pero la reputación de la marca te arrastra.',
    lesson: 'Cuando la marca tiene un escándalo, lo pagan todos los franquiciados.',
  },
  {
    id: 'capital_riesgo',
    title: 'Capital riesgo',
    titleEn: 'Venture capital',
    summary:
      'Invertir en startups: la mayoría fracasan, unas pocas se multiplican por diez o por cien. El dinero queda bloqueado años.',
    lesson: 'Diversifica en muchas y solo con dinero que puedas perder.',
  },
  {
    id: 'agricultura',
    title: 'Tierra agrícola',
    titleEn: 'Farmland',
    summary:
      'La tierra se revaloriza con la inflación y paga una cosecha al año, que depende del clima y del precio de los productos.',
    lesson: 'El regadío cuesta más, pero es el seguro contra la sequía.',
  },
  {
    id: 'clima',
    title: 'Clima y economía',
    titleEn: 'Weather',
    summary:
      'Una sequía hunde las cosechas de secano y dispara el precio del aceite, el café o el trigo.',
    lesson: 'Lo que es malo para el agricultor puede ser bueno para quien tiene la materia prima.',
  },
  {
    id: 'energia',
    title: 'Proyectos de energía',
    titleEn: 'Energy projects',
    summary:
      'Parques solares, eólicos o pozos: ingresos ligados al precio de la electricidad o del petróleo. Los pozos se agotan con los años.',
    lesson: 'Rentas estables… hasta que cambia la regulación.',
  },
  {
    id: 'coleccionismo',
    title: 'Coleccionismo',
    titleEn: 'Collectibles',
    summary:
      'Arte, relojes, vino o coches: comprar y vender cuesta un 25–30 % entre márgenes y comisiones de subasta, y hay que pagar seguro y custodia.',
    lesson: 'Compra lo que te guste tener; la rentabilidad, si llega, es un extra.',
  },
  {
    id: 'falsificacion',
    title: 'Falsificaciones',
    titleEn: 'Forgeries',
    summary:
      'Una parte de las piezas del mercado no son lo que dicen. Se descubre al autenticarlas, normalmente al intentar venderlas.',
    lesson: 'La procedencia y un buen peritaje valen su precio.',
  },
  {
    id: 'entretenimiento',
    title: 'Cine, música y deporte',
    titleEn: 'Entertainment',
    summary:
      'Financiar proyectos creativos: la mayoría no recuperan la inversión, unos pocos son fenómenos.',
    lesson: 'Es una lotería con glamur. Diversifica o disfruta del estreno.',
  },
  {
    id: 'p2p',
    title: 'Préstamos entre particulares',
    titleEn: 'P2P lending',
    summary:
      'Prestas pequeñas cantidades a particulares o pymes a cambio de intereses. Cada préstamo puede impagar.',
    lesson: 'Reparte en muchos préstamos pequeños: un impago no debe arruinar la cartera.',
  },
  {
    id: 'filantropia',
    title: 'Filantropía',
    titleEn: 'Philanthropy',
    summary:
      'Donar reduce impuestos (80 % de los primeros 250 ₳, 35 % del resto) y mejora tu reputación ante distintos colectivos.',
    lesson: 'La reputación también es un activo, aunque no salga en el balance.',
  },
];
