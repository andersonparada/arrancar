import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { fechaLegible } from './retenciones/fechas-de-retenciones.js';

const CAMPO = 'facturaAnterior';

/** Un dato de la factura del sistema anterior no cumple sus reglas (montos, motivo o detalle). */
export class FacturaAnteriorInvalida extends DatoInvalido {
  readonly codigo = 'factura_anterior_invalida';

  constructor(mensaje: string, campo: string) {
    super(mensaje, { campo: `${CAMPO}.${campo}` });
  }
}

/** La empresa no tiene fecha de inicio: sin ella no se sabe qué factura es «del sistema anterior». */
export class FacturaAnteriorSinFechaDeInicio extends ReglaDeNegocioInfringida {
  readonly codigo = 'factura_anterior_sin_fecha_de_inicio';

  constructor() {
    super('La empresa no tiene fecha de inicio: sin ella no se puede registrar una nota sobre una factura anterior.');
  }
}

/** La nota se recibió antes de la fecha de inicio: es del sistema anterior (dictamen U8-l, error 3). */
export class NotaRecibidaAntesDeLaFechaDeInicio extends DatoInvalido {
  readonly codigo = 'nota_recibida_antes_de_la_fecha_de_inicio';

  constructor(fechaDeInicio: string) {
    super(
      `Una nota recibida antes de la fecha de inicio (${fechaLegible(fechaDeInicio)}) es del sistema anterior: si su factura sigue pendiente, cárguela en Saldos iniciales con el saldo ya rebajado.`,
      { campo: 'fechaRecepcion' },
    );
  }
}

/** La factura «del sistema anterior» es de la fecha de inicio o posterior: debe estar en el libro de Arrancar. */
export class FacturaAnteriorPosteriorALaFechaDeInicio extends DatoInvalido {
  readonly codigo = 'factura_anterior_posterior_a_la_fecha_de_inicio';

  constructor(fechaDeInicio: string) {
    super(
      `La factura del sistema anterior debe ser anterior a la fecha de inicio (${fechaLegible(fechaDeInicio)}). Si es de esa fecha o posterior, regístrela en el libro y elíjala en «Factura que corrige».`,
      { campo: `${CAMPO}.fechaEmision` },
    );
  }
}

/** La fecha de la factura es de más de 10 años antes de la fecha de inicio: control de captura, sin citar ley. */
export class FacturaAnteriorMuyAntigua extends DatoInvalido {
  readonly codigo = 'factura_anterior_muy_antigua';

  constructor(fechaMinima: string) {
    super(
      `La fecha de la factura no puede ser de más de 10 años antes de la fecha de inicio: debe ser el ${fechaLegible(fechaMinima)} o posterior. Revise que no haya un error de digitación.`,
      { campo: `${CAMPO}.fechaEmision` },
    );
  }
}

/** La factura que se cita como anterior ya está en el libro de Arrancar: hay que elegirla en la lista. */
export class FacturaAnteriorEstaEnElLibro extends ReglaDeNegocioInfringida {
  readonly codigo = 'factura_anterior_esta_en_el_libro';

  constructor(documentoId: string) {
    super('Esa factura ya está registrada en el libro: elíjala en «Factura que corrige».', {
      documentoId,
      campo: `${CAMPO}.numero`,
    });
  }
}

/** La factura anterior ya existe con otros datos y tiene notas vigentes: se muestran los guardados. */
export class FacturaAnteriorConOtrosDatos extends ReglaDeNegocioInfringida {
  readonly codigo = 'factura_anterior_con_otros_datos';

  constructor(guardados: unknown) {
    super(
      'Esa factura del sistema anterior ya tiene notas registradas con otros datos. Escriba los mismos datos o anule esas notas primero.',
      guardados,
    );
  }
}

/** Otra persona registró la misma factura anterior en este instante. */
export class FacturaAnteriorRegistradaPorOtraPersona extends ReglaDeNegocioInfringida {
  readonly codigo = 'factura_anterior_registrada_por_otra_persona';

  constructor() {
    super('Otra persona acaba de registrar esa factura anterior; vuelva a intentar.');
  }
}

/** Se registra una factura que otra nota ya cita como «del sistema anterior». */
export class FacturaYaEsDelSistemaAnterior extends ReglaDeNegocioInfringida {
  readonly codigo = 'factura_ya_es_del_sistema_anterior';

  constructor(nota: { id: string; serie: string | null; numero: string }) {
    const numero = nota.serie ? `${nota.serie}-${nota.numero}` : nota.numero;
    super(
      `La nota ${numero} la cita como factura del sistema anterior. Si esta factura no estaba en el libro del sistema anterior: anule la nota ${numero}, registre la factura (sin crédito fiscal si ya pasó el plazo del art. 20) y vuelva a registrar la nota eligiendo esta factura.`,
      { notaId: nota.id, campo: 'numero' },
    );
  }
}

/** «No dio crédito por otra causa» exige explicar la causa en las observaciones. */
export class OtraCausaSinDetalle extends DatoInvalido {
  readonly codigo = 'otra_causa_sin_detalle';

  constructor() {
    super('Escriba en las observaciones por qué el documento no dio crédito fiscal.', { campo: 'observaciones' });
  }
}

/** La marca «otra causa» solo se pone a mano en las facturas: la nota hereda el motivo de su factura. */
export class OtraCausaSoloEnFacturas extends DatoInvalido {
  readonly codigo = 'otra_causa_solo_en_facturas';

  constructor() {
    super('«No dio crédito por otra causa» solo se marca en facturas: una nota hereda el motivo de su factura.', {
      campo: 'otraCausaSinCredito',
    });
  }
}

/** Una nota con factura anterior citada en un error de la fecha de inicio. */
export interface NotaCitadaEnLaFecha {
  id: string;
  serie: string | null;
  numero: string;
}

/** Cuántas notas, y hasta cinco de ellas, que estorban al cambiar la fecha de inicio. */
export interface NotasQueEstorban {
  cantidad: number;
  muestra: NotaCitadaEnLaFecha[];
}

/** La fecha de inicio nueva dejaría una factura anterior con emisión igual o posterior a ella. */
export class FacturasAnterioresPosterioresALaFecha extends ReglaDeNegocioInfringida {
  readonly codigo = 'facturas_anteriores_posteriores_a_la_fecha';

  constructor(fechaDeInicio: string, { cantidad, muestra }: NotasQueEstorban) {
    super(
      `Hay ${cantidad} notas sobre facturas del sistema anterior emitidas desde el ${fechaLegible(fechaDeInicio)}: anúlelas o elimínelas antes de mover la fecha de inicio a esa fecha o antes.`,
      { campo: 'fechaDeInicio', cantidad, notas: muestra },
    );
  }
}

/** La fecha de inicio nueva dejaría una nota con factura anterior recibida antes de ella. */
export class NotasRecibidasAntesDeLaFecha extends ReglaDeNegocioInfringida {
  readonly codigo = 'notas_recibidas_antes_de_la_fecha';

  constructor(fechaDeInicio: string, { cantidad, muestra }: NotasQueEstorban) {
    super(
      `Hay ${cantidad} notas sobre facturas del sistema anterior recibidas antes del ${fechaLegible(fechaDeInicio)}: anúlelas o elimínelas antes de mover la fecha de inicio a esa fecha o después.`,
      { campo: 'fechaDeInicio', cantidad, notas: muestra },
    );
  }
}
