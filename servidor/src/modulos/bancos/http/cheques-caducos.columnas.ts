import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  ChequeEnCirculacionDto,
  ReporteDeChequesCaducosDto,
} from '../aplicacion/dto/cheque-en-circulacion.dto.js';

/** Una fila del Excel de cheques caducos, con lo booleano y el origen ya en texto. */
export interface FilaExportadaDeChequeCaduco {
  cuentaBancariaNombre: string;
  serie: string | null;
  numero: number;
  fecha: string;
  diasDeAntiguedad: number;
  beneficiario: string | null;
  monto: string;
  mesConciliado: string;
  origen: string;
}

const TEXTO_DEL_ORIGEN: Record<ChequeEnCirculacionDto['origen'], string> = {
  cuentas_por_pagar: 'Cuentas por pagar',
  suelto: 'Suelto',
};

const aFilaExportada = (cheque: ChequeEnCirculacionDto): FilaExportadaDeChequeCaduco => ({
  cuentaBancariaNombre: cheque.cuentaBancariaNombre,
  serie: cheque.serie,
  numero: cheque.numero,
  fecha: cheque.fecha,
  diasDeAntiguedad: cheque.diasDeAntiguedad,
  beneficiario: cheque.beneficiario,
  monto: cheque.monto,
  mesConciliado: cheque.mesConciliado ? 'Sí' : 'No',
  origen: TEXTO_DEL_ORIGEN[cheque.origen],
});

/** El reporte en filas planas para Excel: una por cheque. */
export const aFilasExportadasDeChequesCaducos = ({ cheques }: ReporteDeChequesCaducosDto) =>
  cheques.map(aFilaExportada);

/** Las columnas del Excel de cheques caducos: solo se exporta, nunca se importa. */
export const columnasDelReporteDeChequesCaducos: Columna[] = [
  { clave: 'cuentaBancariaNombre', titulo: 'Cuenta', requerido: true, tipo: 'texto' },
  { clave: 'serie', titulo: 'Serie', requerido: false, tipo: 'texto' },
  { clave: 'numero', titulo: 'Número de cheque', requerido: true, tipo: 'entero' },
  { clave: 'fecha', titulo: 'Fecha', requerido: true, tipo: 'fecha' },
  { clave: 'diasDeAntiguedad', titulo: 'Días de antigüedad', requerido: true, tipo: 'entero' },
  { clave: 'beneficiario', titulo: 'Beneficiario', requerido: false, tipo: 'texto' },
  { clave: 'monto', titulo: 'Monto', requerido: true, tipo: 'decimal' },
  { clave: 'mesConciliado', titulo: 'Mes conciliado', requerido: true, tipo: 'texto' },
  { clave: 'origen', titulo: 'Origen', requerido: true, tipo: 'texto' },
];
