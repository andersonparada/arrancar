import { fechaLegible, quetzales } from './avisos.js';
import { etiquetaDe, type DocumentoPorPagar } from './documento-por-pagar.js';

/** Una retención de un documento del libro, tal como la guardó Libro de compras (solo las de monto mayor que cero). */
export interface RetencionDelLibro {
  impuesto: 'iva' | 'isr';
  montoCentavos: number;
  /** `AAAA-MM-DD`: la fecha de la retención, que fija el mes en que se entera. */
  fecha: string;
  constanciaNumero: string | null;
}

/** La contraseña de la línea, con su número ya formateado y su fecha. */
export interface ContrasenaDeLaLinea {
  numero: string;
  /** `AAAA-MM-DD`. */
  fecha: string;
}

/** Lo que hace falta para avisar sobre una línea del pago: su cargo, sus retenciones y las fechas que mira. */
export interface LineaParaAvisar {
  documento: DocumentoPorPagar;
  /** `AAAA-MM-DD`. */
  fechaDelPago: string;
  /** Lo que este pago descuenta de la retención del cargo (cero si no es su primer pago). */
  retencionDescontadaCentavos: number;
  retenciones: readonly RetencionDelLibro[];
  /** La recepción en el libro; `null` en un saldo inicial. */
  fechaDeRecepcion: string | null;
  contrasena: ContrasenaDeLaLinea | null;
}

const mesLegible = (fecha: string): string => `${fecha.slice(5, 7)}/${fecha.slice(0, 4)}`;

function avisosDeLaRetencion({ documento, fechaDelPago, retenciones }: LineaParaAvisar): string[] {
  const etiqueta = etiquetaDe(documento);
  const avisos = retenciones
    .filter(({ constanciaNumero }) => constanciaNumero === null)
    .map(
      ({ impuesto }) =>
        `La retención de ${impuesto.toUpperCase()} de la factura ${etiqueta} no tiene constancia registrada: emítala en Retenciones Web y entréguela con este pago.`,
    );
  const meses = [...new Set(retenciones.map(({ fecha }) => fecha.slice(0, 7)))];
  const deMesAnterior = meses.filter((mes) => mes < fechaDelPago.slice(0, 7));
  for (const mes of deMesAnterior) {
    avisos.push(
      `La retención de la factura ${etiqueta} es de ${mesLegible(`${mes}-01`)}: se entera con ese mes, aunque el pago sea después. Revísela en Libro de compras → Retenciones.`,
    );
  }
  return avisos;
}

function avisosDeFechaAnterior({ documento, fechaDelPago, fechaDeRecepcion, contrasena }: LineaParaAvisar): string[] {
  const avisos: string[] = [];
  if (fechaDeRecepcion !== null && fechaDelPago < fechaDeRecepcion) {
    avisos.push(
      `La fecha del pago es anterior a la recepción de la factura ${etiquetaDe(documento)} (${fechaLegible(fechaDeRecepcion)}).`,
    );
  }
  if (contrasena !== null && fechaDelPago < contrasena.fecha) {
    avisos.push(
      `La fecha del pago es anterior a la fecha de la contraseña ${contrasena.numero} (${fechaLegible(contrasena.fecha)}).`,
    );
  }
  return avisos;
}

/** El saldo inicial con retenciones sin practicar: Arrancar no las descuenta del pago (U8 §2). */
function avisoDeRetencionesPorPracticar(documento: DocumentoPorPagar): string[] {
  const porPracticar = documento.retencionesPorPracticarCentavos ?? 0;
  if (documento.origen !== 'saldo_inicial' || porPracticar <= 0) return [];
  return [
    `El documento ${etiquetaDe(documento)} tiene ${quetzales(porPracticar)} de retenciones por practicar del sistema anterior: emita la constancia en Retenciones Web y entérela. Arrancar no las descuenta del pago.`,
  ];
}

/**
 * Los avisos de una línea del pago que no bloquean: las retenciones que este pago descuenta (constancia sin emitir y mes en
 * que se enteran), las retenciones por practicar de un saldo inicial y la fecha anterior a la recepción o a la contraseña.
 */
export function avisosDeLaLinea(linea: LineaParaAvisar): string[] {
  const deLaRetencion = linea.retencionDescontadaCentavos > 0 ? avisosDeLaRetencion(linea) : [];
  return [...deLaRetencion, ...avisoDeRetencionesPorPracticar(linea.documento), ...avisosDeFechaAnterior(linea)];
}

/** La diferencia que se da por saldada en un cargo con retención puede ser una retención mal calculada. */
export function avisoDeDiferenciaConRetencion(documento: DocumentoPorPagar): string[] {
  if (documento.retencionesCentavos <= 0) return [];
  return [
    `Si la diferencia del documento ${etiquetaDe(documento)} viene de la retención (el proveedor calculó otra), no la salde: revise la retención en Libro de compras.`,
  ];
}

/** El cheque posfechado compromete el documento hoy y lo da por pagado en su fecha; se paga a la vista (C-CP4-1). */
export function avisoDelPosfechado(forma: 'cheque' | 'nota_de_debito' | 'nota_ligada', fecha: string): string {
  const quien = forma === 'cheque' ? 'El cheque' : 'La nota de débito';
  const aLaVista = forma === 'cheque' ? ' El cheque se paga a la vista: el proveedor puede cobrarlo antes.' : '';
  return `${quien} lleva fecha ${fechaLegible(fecha)}: el documento queda comprometido y se da por pagado en esa fecha.${aLaVista}`;
}

/** El banco debitó la nota sin descontar la retención: lo que sobra de la nota queda por aplicar (CP4, §5.2). */
export function avisoDeRetencionNoDescontada(
  documento: DocumentoPorPagar,
  { retencionCentavos, restanteDeLaNotaCentavos }: { retencionCentavos: number; restanteDeLaNotaCentavos: number },
): string {
  return `El banco debitó la nota sin descontar la retención de ${quetzales(retencionCentavos)} de la factura ${etiquetaDe(documento)}: quedan ${quetzales(restanteDeLaNotaCentavos)} de la nota por aplicar. Revise la retención en Libro de compras (si no la practicó, corríjala allí; si la practicó, el proveedor le debe ese monto).`;
}

/** La nota es de un año anterior al de su aplicación (nota de diciembre y FEL de enero). */
export function avisoDeNotaDeAnioAnterior(fechaDeLaNota: string, fechaDeLaAplicacion: string): string[] {
  if (fechaDeLaNota.slice(0, 4) >= fechaDeLaAplicacion.slice(0, 4)) return [];
  return [
    `La nota es del ${fechaLegible(fechaDeLaNota)} y se aplica con fecha ${fechaLegible(fechaDeLaAplicacion)}, de otro año: revise que corresponda a esas facturas.`,
  ];
}
