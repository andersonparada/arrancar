import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { FilaDelReporte } from '../aplicacion/calculo-de-reporte-de-movimientos.js';

/** Una fila ya lista para su celda en Excel: el débito y el crédito separados, y el tipo y el anulado en texto. */
export interface FilaExportadaDelReporte {
  fecha: string;
  cuentaBancariaNombre: string | null;
  tipoTexto: string;
  numeroDeNota: string | null;
  numeroDeCheque: number | null;
  referencia: string | null;
  beneficiario: string | null;
  debito: string | null;
  credito: string | null;
  saldo: string | null;
  anulado: boolean;
}

const TEXTO_DEL_TIPO: Record<FilaDelReporte['tipo'], string> = {
  credito: 'Nota de crédito',
  debito: 'Nota de débito',
  cheque: 'Cheque',
};

/** El número del comprobante como se ve en pantalla: `2026-15` si se reinicia por año y `15` si no; `null` si no lleva. */
export function numeroEnTexto({
  numero,
  anioDeNumero,
}: Pick<FilaDelReporte, 'numero' | 'anioDeNumero'>): string | null {
  if (numero === null) return null;
  return anioDeNumero > 0 ? `${anioDeNumero}-${numero}` : String(numero);
}

/** El reporte solo exporta (es lectura): débito y crédito en columnas separadas, como se ve en pantalla. */
export const aFilaExportadaDelReporte = (fila: FilaDelReporte): FilaExportadaDelReporte => ({
  fecha: fila.fecha,
  cuentaBancariaNombre: fila.cuentaBancariaNombre,
  tipoTexto: TEXTO_DEL_TIPO[fila.tipo],
  numeroDeNota: numeroEnTexto(fila),
  numeroDeCheque: fila.numeroDeCheque,
  referencia: fila.referencia,
  beneficiario: fila.beneficiario,
  debito: fila.tipo === 'credito' ? null : fila.monto,
  credito: fila.tipo === 'credito' ? fila.monto : null,
  saldo: fila.saldo,
  anulado: fila.anuladoEn !== null,
});

/** Las columnas del Excel del reporte de movimientos: solo se exporta, nunca se importa. */
export const columnasDelReporteDeMovimientos: Columna[] = [
  { clave: 'fecha', titulo: 'Fecha', requerido: true, tipo: 'fecha' },
  { clave: 'cuentaBancariaNombre', titulo: 'Cuenta', requerido: false, tipo: 'texto' },
  { clave: 'tipoTexto', titulo: 'Tipo', requerido: true, tipo: 'texto' },
  { clave: 'numeroDeNota', titulo: 'No.', requerido: false, tipo: 'texto' },
  { clave: 'numeroDeCheque', titulo: 'Número de cheque', requerido: false, tipo: 'entero' },
  { clave: 'referencia', titulo: 'Referencia', requerido: false, tipo: 'texto' },
  { clave: 'beneficiario', titulo: 'Beneficiario u origen', requerido: false, tipo: 'texto' },
  { clave: 'debito', titulo: 'Débito', requerido: false, tipo: 'decimal' },
  { clave: 'credito', titulo: 'Crédito', requerido: false, tipo: 'decimal' },
  { clave: 'saldo', titulo: 'Saldo', requerido: false, tipo: 'decimal' },
  { clave: 'anulado', titulo: 'Anulado', requerido: false, tipo: 'siNo' },
];
