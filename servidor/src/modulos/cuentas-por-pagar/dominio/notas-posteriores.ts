import { TIPOS_DE_FACTURA, type TipoDeDocumento } from './tipos-de-documento.js';

/** Una nota del libro sobre una factura del sistema anterior que no se enlazó a ningún saldo inicial (quedó libre o suelta). */
export interface NotaLibreDelSistemaAnterior {
  proveedorId: string;
  tipo: TipoDeDocumento;
  /** La serie y el número de la factura anterior que cita. */
  serie: string | null;
  numero: string;
  /** Lo que de una nota de crédito sigue libre, en centavos; cero en una de débito. */
  saldoLibreCentavos: number;
}

/** Las notas posteriores a la carga de un saldo inicial que lo citan sin estar enlazadas a él. */
export interface NotasPosteriores {
  notasDeCredito: number;
  /** El saldo a favor que dejan esas notas de crédito, en centavos. */
  saldoLibreCentavos: number;
  notasDeDebito: number;
}

export const SIN_NOTAS_POSTERIORES: NotasPosteriores = { notasDeCredito: 0, saldoLibreCentavos: 0, notasDeDebito: 0 };

interface SaldoInicialBuscado {
  proveedorId: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
}

const esFactura = (tipo: TipoDeDocumento): boolean => TIPOS_DE_FACTURA.some((factura) => factura === tipo);

const citaAlSaldo = (saldo: SaldoInicialBuscado, nota: NotaLibreDelSistemaAnterior): boolean =>
  nota.proveedorId === saldo.proveedorId && nota.numero === saldo.numero && (nota.serie ?? '') === (saldo.serie ?? '');

/**
 * Las notas libres que citan la factura de un saldo inicial. No se enlazan solas (se aplican a mano en Notas de crédito):
 * esto solo sirve para avisarlo. Una nota de crédito sin saldo libre (ya aplicada o ajustada) no cuenta.
 */
export function notasPosterioresDe(
  saldo: SaldoInicialBuscado,
  libres: readonly NotaLibreDelSistemaAnterior[],
): NotasPosteriores {
  if (!esFactura(saldo.tipo)) return SIN_NOTAS_POSTERIORES;
  const citan = libres.filter((nota) => citaAlSaldo(saldo, nota));
  const deCredito = citan.filter((nota) => nota.tipo === 'nota_de_credito' && nota.saldoLibreCentavos > 0);
  return {
    notasDeCredito: deCredito.length,
    saldoLibreCentavos: deCredito.reduce((suma, nota) => suma + nota.saldoLibreCentavos, 0),
    notasDeDebito: citan.filter((nota) => nota.tipo === 'nota_de_debito').length,
  };
}

/** Si el saldo inicial tiene alguna nota posterior libre. */
export const tieneNotasPosteriores = ({ notasDeCredito, notasDeDebito }: NotasPosteriores): boolean =>
  notasDeCredito + notasDeDebito > 0;
