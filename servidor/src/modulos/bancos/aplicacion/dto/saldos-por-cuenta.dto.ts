import type { ParteDeApertura } from '../../dominio/partes-de-apertura.js';

/** Qué es una partida que el banco aún no ha visto a la fecha del reporte. */
export type CategoriaEnTransito =
  'cheque_en_circulacion' | 'deposito_en_transito' | 'debito_en_transito' | 'error_del_banco';

/** Un movimiento en tránsito a la fecha (detalle desplegable). */
export interface PartidaEnTransitoDto {
  movimientoId: string;
  cuentaBancariaId: string;
  categoria: CategoriaEnTransito;
  tipo: 'credito' | 'debito' | 'cheque';
  fecha: string;
  monto: string;
  numeroDeCheque: number | null;
  referencia: string | null;
  beneficiario: string | null;
  parteDeApertura: ParteDeApertura | null;
}

/** Cuántas partidas de una categoría hay y su monto (siempre positivo; en los errores del banco, el efecto neto en libros). */
export interface TotalEnTransitoDto {
  cantidad: number;
  monto: string;
}

/** Un mes conciliado (autorizado): año y mes de 1 a 12. */
export interface MesDeConciliacionDto {
  anio: number;
  mes: number;
}

export interface SaldoDeCuentaDto {
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  bancoNombre: string | null;
  numero: string;
  activo: boolean;
  /** Créditos menos débitos vigentes con fecha hasta el corte. */
  saldoEnLibros: string;
  /** Cheques vigentes con fecha posterior al corte (comprometido). */
  chequesPosfechados: string;
  /** Saldo en libros menos posfechados; no suma el sobregiro autorizado ni los fondos retenidos. */
  disponible: string;
  /** Hay posfechados y el disponible quedó negativo. */
  fondosInsuficientes: boolean;
  chequesEnCirculacion: TotalEnTransitoDto;
  depositosEnTransito: TotalEnTransitoDto;
  debitosEnTransito: TotalEnTransitoDto;
  /** El monto es el efecto neto en libros (puede ser negativo). */
  erroresDelBanco: TotalEnTransitoDto;
  /** Lo que debería mostrar el estado de cuenta del banco al corte. */
  saldoSegunBanco: string;
  ultimaConciliacion: MesDeConciliacionDto | null;
  /** Tiene movimientos de meses completos anteriores al corte y su última conciliación autorizada no los cubre. */
  atrasada: boolean;
  partidas: PartidaEnTransitoDto[];
}

/** Un lado del balance, sin compensar con el otro (NIIF para las Pymes 2.52). Siempre valores positivos. */
export interface TotalDeSaldosDto {
  cantidadDeCuentas: number;
  saldoEnLibros: string;
  chequesPosfechados: string;
  disponible: string;
}

export interface ReporteDeSaldosPorCuentaDto {
  fecha: string;
  cuentas: SaldoDeCuentaDto[];
  /** Cuentas con saldo en libros de cero o positivo. */
  bancos: TotalDeSaldosDto;
  /** Cuentas con saldo en libros negativo, en valor absoluto. */
  sobregiros: TotalDeSaldosDto;
  nota: string;
}

export interface FiltroDeSaldosPorCuenta {
  fecha?: string;
  cuentaBancariaId?: string;
}
