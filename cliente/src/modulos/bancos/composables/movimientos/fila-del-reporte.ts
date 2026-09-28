import type { FilaDelReporte } from '../../servicios/movimientos.api';

export const OPCIONES_DE_TIPO: Record<'credito' | 'debito', string> = {
  credito: 'Nota de crédito',
  debito: 'Nota de débito',
};

export interface InfoDeDocumento {
  titulo: string;
  subtitulo: string | null;
}

/** Qué documento es la fila: un cheque con su número, el saldo inicial, o una nota con su referencia. */
export function documentoDeFila(fila: FilaDelReporte): InfoDeDocumento {
  if (fila.tipo === 'cheque') return { titulo: `Cheque No. ${fila.numeroDeCheque ?? ''}`, subtitulo: fila.referencia };
  if (fila.saldoInicial) return { titulo: 'Saldo inicial', subtitulo: fila.referencia };
  return { titulo: OPCIONES_DE_TIPO[fila.tipo as 'credito' | 'debito'], subtitulo: fila.referencia };
}

/** El monto en la columna Débito, o `null` si la fila es un crédito. */
export const debitoDeFila = (fila: FilaDelReporte): string | null => (fila.tipo === 'credito' ? null : fila.monto);

/** El monto en la columna Crédito, o `null` si la fila es un débito o un cheque. */
export const creditoDeFila = (fila: FilaDelReporte): string | null => (fila.tipo === 'credito' ? fila.monto : null);
