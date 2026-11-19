import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  MesDeConciliacionDto,
  ReporteDeSaldosPorCuentaDto,
  SaldoDeCuentaDto,
  TotalDeSaldosDto,
} from '../aplicacion/dto/saldos-por-cuenta.dto.js';

/** Una fila del Excel: una cuenta o el total de un lado (Bancos o Sobregiros bancarios), sin compensar. */
export interface FilaExportadaDeSaldos {
  cuenta: string;
  banco: string | null;
  numero: string | null;
  saldoEnLibros: string | null;
  chequesPosfechados: string | null;
  disponible: string | null;
  chequesEnCirculacion: string | null;
  depositosEnTransito: string | null;
  debitosEnTransito: string | null;
  erroresDelBanco: string | null;
  saldoSegunBanco: string | null;
  ultimaConciliacion: string | null;
  atrasada: boolean | null;
  observacion: string | null;
}

const OBSERVACION_DE_FONDOS = 'Fondos insuficientes para los posfechados';

/** `mm/aaaa`, como se ve en pantalla. */
export const mesEnTexto = (mes: MesDeConciliacionDto | null): string | null =>
  mes ? `${String(mes.mes).padStart(2, '0')}/${mes.anio}` : null;

const deCuenta = (cuenta: SaldoDeCuentaDto): FilaExportadaDeSaldos => ({
  cuenta: cuenta.cuentaBancariaNombre,
  banco: cuenta.bancoNombre,
  numero: cuenta.numero,
  saldoEnLibros: cuenta.saldoEnLibros,
  chequesPosfechados: cuenta.chequesPosfechados,
  disponible: cuenta.disponible,
  chequesEnCirculacion: cuenta.chequesEnCirculacion.monto,
  depositosEnTransito: cuenta.depositosEnTransito.monto,
  debitosEnTransito: cuenta.debitosEnTransito.monto,
  erroresDelBanco: cuenta.erroresDelBanco.monto,
  saldoSegunBanco: cuenta.saldoSegunBanco,
  ultimaConciliacion: mesEnTexto(cuenta.ultimaConciliacion),
  atrasada: cuenta.atrasada,
  observacion: cuenta.fondosInsuficientes ? OBSERVACION_DE_FONDOS : null,
});

const deTotal = (nombre: string, total: TotalDeSaldosDto): FilaExportadaDeSaldos => ({
  cuenta: nombre,
  banco: null,
  numero: null,
  saldoEnLibros: total.saldoEnLibros,
  chequesPosfechados: total.chequesPosfechados,
  disponible: total.disponible,
  chequesEnCirculacion: null,
  depositosEnTransito: null,
  debitosEnTransito: null,
  erroresDelBanco: null,
  saldoSegunBanco: null,
  ultimaConciliacion: null,
  atrasada: null,
  observacion: null,
});

/** El renglón de la nota: solo texto, sin cifras ni «Atrasada». */
const deNota = (nota: string): FilaExportadaDeSaldos => ({
  ...deTotal('Nota', { cantidadDeCuentas: 0, saldoEnLibros: '0.00', chequesPosfechados: '0.00', disponible: '0.00' }),
  saldoEnLibros: null,
  chequesPosfechados: null,
  disponible: null,
  observacion: nota,
});

/** Las cuentas y, al final, los dos totales sin compensar; la última fila repite la nota del disponible. */
export const aFilasExportadasDeSaldos = (reporte: ReporteDeSaldosPorCuentaDto): FilaExportadaDeSaldos[] => [
  ...reporte.cuentas.map(deCuenta),
  deTotal('Total Bancos', reporte.bancos),
  deTotal('Total Sobregiros bancarios', reporte.sobregiros),
  deNota(reporte.nota),
];

const decimal = (clave: keyof FilaExportadaDeSaldos, titulo: string, requerido = false): Columna => ({
  clave,
  titulo,
  requerido,
  tipo: 'decimal',
});

/** Las columnas del Excel de saldos por cuenta: solo se exporta, nunca se importa. */
export const columnasDeSaldosPorCuenta: Columna[] = [
  { clave: 'cuenta', titulo: 'Cuenta', requerido: true, tipo: 'texto' },
  { clave: 'banco', titulo: 'Banco', requerido: false, tipo: 'texto' },
  { clave: 'numero', titulo: 'Número', requerido: false, tipo: 'texto' },
  decimal('saldoEnLibros', 'Saldo en libros', true),
  decimal('chequesPosfechados', 'Cheques posfechados', true),
  decimal('disponible', 'Disponible', true),
  decimal('chequesEnCirculacion', 'Cheques en circulación'),
  decimal('depositosEnTransito', 'Depósitos en tránsito'),
  decimal('debitosEnTransito', 'Débitos en tránsito'),
  decimal('erroresDelBanco', 'Errores del banco (neto)'),
  decimal('saldoSegunBanco', 'Saldo según el banco'),
  { clave: 'ultimaConciliacion', titulo: 'Última conciliación', requerido: false, tipo: 'texto' },
  { clave: 'atrasada', titulo: 'Atrasada', requerido: false, tipo: 'siNo' },
  { clave: 'observacion', titulo: 'Observación', requerido: false, tipo: 'texto' },
];
