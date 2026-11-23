import {
  FacturaAnteriorInvalida,
  FacturaNoSirveParaLaNota,
  NotaAnteriorALaFactura,
  NotaConDosFacturas,
  NotaExcedeLaFactura,
  NotaSinFactura,
  NotaSobreFacturaEspecial,
} from './errores-de-notas.js';
import { DocumentoInvalido } from './errores-de-documento.js';
import { venceLaVispera } from './fechas-del-libro.js';
import { TOLERANCIA_MINIMA_DE_IVA_EN_CENTAVOS } from './reparto-de-iva.js';
import { FAMILIAS_QUE_ADMITEN_NOTA, esNota, type TipoDeDocumento, type TipoDeNota } from './tipos-de-documento.js';

/** Meses de la factura dentro de los que se puede emitir una nota de crédito que rebaje el débito (Ley del IVA, art. 17). */
export const MESES_DE_PLAZO_DE_LA_NOTA_DE_CREDITO = 2;

export const AVISO_DE_NOTA_DE_CREDITO_TARDIA =
  'Fuera del plazo del art. 17: la SAT podría rechazar la rebaja del débito. La nota rebaja el débito del mes en que se emite, sin rectificar el mes de la factura.';

export const AVISO_DE_NOTA_DE_ABONO =
  'Si es un descuento o una devolución, use nota de crédito: la nota de abono no rebaja el IVA (art. 17).';

/** La factura del sistema anterior que corrige una nota; no está en el libro de Arrancar. */
export interface FacturaAnteriorEscrita {
  serie: string | null;
  numero: string;
  fecha: string;
}

/** Lo que de la factura importa para saber si una nota puede corregirla. */
export interface FacturaDeLaNota {
  tipo: TipoDeDocumento;
  estado: 'vigente' | 'anulado';
  clienteId: string | null;
  fechaEmision: string;
}

/** La nota que se quiere registrar. */
export interface NotaPorRegistrar {
  tipo: TipoDeNota;
  clienteId: string | null;
  fechaEmision: string;
}

/**
 * Una nota corrige una factura del libro o una del sistema anterior (nunca las dos); lo que no es nota no corrige nada.
 * @throws NotaSinFactura, NotaConDosFacturas o DocumentoInvalido.
 */
export function exigirReferenciaCoherente(datos: {
  tipo: TipoDeDocumento;
  documentoAfectadoId: string | null;
  facturaAnterior: FacturaAnteriorEscrita | null;
}): void {
  const referencias = Number(datos.documentoAfectadoId !== null) + Number(datos.facturaAnterior !== null);
  if (!esNota(datos.tipo)) {
    if (referencias > 0) throw new DocumentoInvalido('Solo una nota corrige otra factura.');
    return;
  }
  if (referencias === 0) throw new NotaSinFactura();
  if (referencias === 2) throw new NotaConDosFacturas();
}

/**
 * La factura del sistema anterior es de antes de la fecha de inicio (si no, estaría en el libro) y no es posterior a la
 * nota. Sin fecha de inicio no hay sistema anterior que citar.
 * @throws FacturaAnteriorInvalida o NotaAnteriorALaFactura.
 */
export function exigirFacturaAnteriorValida(
  anterior: FacturaAnteriorEscrita,
  contexto: { fechaDeInicio: string | null; fechaDeLaNota: string },
): void {
  if (contexto.fechaDeInicio === null || anterior.fecha >= contexto.fechaDeInicio) {
    throw new FacturaAnteriorInvalida(
      'La factura del sistema anterior debe ser de antes de la fecha de inicio de la empresa; si no, regístrela en el libro.',
    );
  }
  if (contexto.fechaDeLaNota < anterior.fecha) throw new NotaAnteriorALaFactura();
}

/**
 * La factura de una nota debe ser de una familia que admite notas, vigente, del mismo cliente y no posterior a la nota.
 * @throws NotaSobreFacturaEspecial, FacturaNoSirveParaLaNota o NotaAnteriorALaFactura.
 */
export function exigirFacturaQueAdmiteLaNota(factura: FacturaDeLaNota, nota: NotaPorRegistrar): void {
  if (factura.tipo === 'factura_especial_recibida') throw new NotaSobreFacturaEspecial();
  if (factura.estado !== 'vigente' || !FAMILIAS_QUE_ADMITEN_NOTA.includes(factura.tipo)) {
    throw new FacturaNoSirveParaLaNota('La nota debe corregir una factura vigente.');
  }
  if (factura.clienteId !== nota.clienteId) {
    throw new FacturaNoSirveParaLaNota('La factura debe ser del mismo cliente que la nota.');
  }
  if (nota.fechaEmision < factura.fechaEmision) throw new NotaAnteriorALaFactura();
}

/** La factura con lo que ya corrigieron sus notas vigentes, por familia de nota. Montos en centavos. */
export interface FacturaConNotas {
  total: number;
  iva: number;
  totalDeNotasDeCredito: number;
  ivaDeNotasDeCredito: number;
  totalDeNotasDeDebito: number;
  ivaDeNotasDeDebito: number;
}

/**
 * El tope de las notas de crédito: su suma, en total y en IVA, no pasa de la factura más sus notas de débito vigentes.
 * Cada nota redondea su IVA por su cuenta, así que la que agota el total de la factura puede pasarse del saldo de IVA
 * hasta `TOLERANCIA_MINIMA_DE_IVA_EN_CENTAVOS` (Q0.05); si no agota el total, el tope del IVA es exacto. La nota de
 * débito aumenta la factura, así que no tiene tope; la de abono tampoco (no toca el débito). La fila de la factura debe
 * estar bloqueada (`for update`) para que dos notas a la vez no se pasen.
 * @throws NotaExcedeLaFactura
 */
export function exigirQueLaNotaNoSupereLaFactura(
  factura: FacturaConNotas,
  nota: { tipo: TipoDeNota; total: number; iva: number },
): void {
  if (nota.tipo !== 'nota_de_credito') return;
  const totalAcumulado = factura.totalDeNotasDeCredito + nota.total;
  const topeDelTotal = factura.total + factura.totalDeNotasDeDebito;
  const margen = totalAcumulado === topeDelTotal ? TOLERANCIA_MINIMA_DE_IVA_EN_CENTAVOS : 0;
  const iva = factura.ivaDeNotasDeCredito + nota.iva > factura.iva + factura.ivaDeNotasDeDebito + margen;
  if (totalAcumulado > topeDelTotal || iva) throw new NotaExcedeLaFactura();
}

/** `true` si la nota de crédito se emite pasados los dos meses de su factura (vence la víspera). */
export function esNotaDeCreditoTardia(fechaDeLaNota: string, fechaDeLaFactura: string): boolean {
  return fechaDeLaNota > venceLaVispera(fechaDeLaFactura, MESES_DE_PLAZO_DE_LA_NOTA_DE_CREDITO);
}

/** Avisos de la nota (no bloquean): la de crédito tardía y la de abono. `fechaDeLaFactura` es la del libro o la anterior. */
export function avisosDeLaNota(nota: { tipo: TipoDeNota; fechaEmision: string }, fechaDeLaFactura: string): string[] {
  if (nota.tipo === 'nota_de_abono') return [AVISO_DE_NOTA_DE_ABONO];
  const tardia = nota.tipo === 'nota_de_credito' && esNotaDeCreditoTardia(nota.fechaEmision, fechaDeLaFactura);
  return tardia ? [AVISO_DE_NOTA_DE_CREDITO_TARDIA] : [];
}
