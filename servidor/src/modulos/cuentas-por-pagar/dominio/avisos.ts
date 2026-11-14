import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import type { DocumentoPorPagar } from './documento-por-pagar.js';

/** Centavos como quetzales para un mensaje: `120000` → `Q1,200.00`. */
export function quetzales(centavos: number): string {
  const [enteros = '0', decimales = '00'] = deCentavos(centavos).split('.');
  return `Q${enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimales}`;
}

/** `AAAA-MM-DD` como `dd/mm/aaaa`, para los mensajes. */
export function fechaLegible(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

/**
 * Lo que se le dice a quien registra una nota de crédito que deja saldo libre: la retención ya se practicó, así que el
 * proveedor le debe esa parte a la empresa y se compensa en la próxima factura o se le pide en reintegro (U13).
 */
export function avisoDeSaldoALaFavor(saldoLibreCentavos: number): string {
  return `Esta nota deja ${quetzales(saldoLibreCentavos)} a favor de la empresa porque la retención ya se practicó. Compénselo en la próxima factura o pida el reintegro al proveedor.`;
}

/** Una nota sobre una factura del sistema anterior que deja saldo libre: parte puede ser retención. */
export const AVISO_DE_RETENCION_EN_EL_SALDO_LIBRE =
  'Si la factura tuvo retención, parte de este saldo puede corresponder a ella.';

/** Los datos con que se nombra la factura anterior en los avisos. */
export interface FacturaCitada {
  serie: string | null;
  numero: string;
}

const nombreDe = ({ serie, numero }: FacturaCitada): string => (serie ? `${serie}-${numero}` : numero);

/** El saldo inicial existe pero la nota cita otra fecha de emisión: se enlaza igual, para que se revise. */
export function avisoDeFechaDistinta(saldo: FacturaCitada & { fechaEmision: string }, fechaDeLaNota: string): string {
  return `El saldo inicial ${nombreDe(saldo)} tiene fecha ${fechaLegible(saldo.fechaEmision)} y la nota cita ${fechaLegible(fechaDeLaNota)}; revise.`;
}

/** El saldo inicial todavía tiene retenciones sin practicar: la nota puede cambiar la que falta emitir. */
export function avisoDeRetencionesPorPracticar(saldo: FacturaCitada, retencionesCentavos: number): string {
  return `El saldo inicial ${nombreDe(saldo)} tiene ${quetzales(retencionesCentavos)} de retenciones por practicar: revise si la nota cambia la retención que falta emitir.`;
}

/** No hay saldo inicial de la factura que cita una nota de crédito: todo su total queda libre. */
export function avisoDeNotaDeCreditoSinSaldoInicial(factura: FacturaCitada, totalCentavos: number): string {
  return `No hay un saldo inicial ${nombreDe(factura)} de este proveedor: la nota queda como saldo a favor de ${quetzales(totalCentavos)}; si la factura todavía se debe, cárguela en Saldos iniciales y aplique la nota en Notas de crédito.`;
}

/** No hay saldo inicial de la factura que cita una nota de débito: queda como un cargo suelto. */
export function avisoDeNotaDeDebitoSinSaldoInicial(factura: FacturaCitada): string {
  return `No hay un saldo inicial ${nombreDe(factura)} de este proveedor: la nota de débito queda como un cargo sin factura.`;
}

/** Lo que se sabe de una nota sobre una factura del sistema anterior al armar sus avisos. */
interface NotaSobreFacturaAnterior {
  tipo: 'nota_de_credito' | 'nota_de_debito';
  /** El saldo inicial al que se enlazó; `null` si no está cargado. */
  saldoInicial: DocumentoPorPagar | null;
  /** La factura que cita la nota. */
  citada: FacturaCitada & { fechaEmision: string };
  /** Lo que de la nota de crédito quedó libre, en centavos. */
  saldoLibreCentavos: number;
}

function avisosDeNotaSinSaldoInicial({ tipo, citada, saldoLibreCentavos }: NotaSobreFacturaAnterior): string[] {
  if (tipo === 'nota_de_debito') return [avisoDeNotaDeDebitoSinSaldoInicial(citada)];
  return [avisoDeNotaDeCreditoSinSaldoInicial(citada, saldoLibreCentavos), AVISO_DE_RETENCION_EN_EL_SALDO_LIBRE];
}

/**
 * Los avisos de una nota que cita una factura del sistema anterior (no bloquean): si no hay saldo inicial, que queda
 * libre o suelta; si lo hay, la fecha distinta, el saldo libre con la posible retención y las retenciones por practicar.
 */
export function avisosDeNotaSobreFacturaAnterior(nota: NotaSobreFacturaAnterior): string[] {
  const { tipo, saldoInicial, citada, saldoLibreCentavos } = nota;
  if (!saldoInicial) return avisosDeNotaSinSaldoInicial(nota);
  const avisos: string[] = [];
  if (saldoInicial.fechaEmision !== citada.fechaEmision) {
    avisos.push(avisoDeFechaDistinta(saldoInicial, citada.fechaEmision));
  }
  if (tipo !== 'nota_de_credito') return avisos;
  if (saldoLibreCentavos > 0) {
    avisos.push(avisoDeSaldoALaFavor(saldoLibreCentavos), AVISO_DE_RETENCION_EN_EL_SALDO_LIBRE);
  }
  const porPracticar = saldoInicial.retencionesPorPracticarCentavos ?? 0;
  if (porPracticar > 0) avisos.push(avisoDeRetencionesPorPracticar(saldoInicial, porPracticar));
  return avisos;
}
