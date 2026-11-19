import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';
import type { MesDeConciliacion } from './movimientos.api';

export type CategoriaEnTransito =
  'cheque_en_circulacion' | 'deposito_en_transito' | 'debito_en_transito' | 'error_del_banco';

/** Un movimiento que el banco aún no ha visto a la fecha del reporte. */
export interface PartidaEnTransito {
  movimientoId: string;
  cuentaBancariaId: string;
  categoria: CategoriaEnTransito;
  tipo: 'credito' | 'debito' | 'cheque';
  fecha: string;
  monto: string;
  numeroDeCheque: number | null;
  referencia: string | null;
  beneficiario: string | null;
  parteDeApertura: string | null;
}

export interface TotalEnTransito {
  cantidad: number;
  monto: string;
}

export interface SaldoDeCuenta {
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  bancoNombre: string | null;
  numero: string;
  activo: boolean;
  saldoEnLibros: string;
  chequesPosfechados: string;
  disponible: string;
  fondosInsuficientes: boolean;
  chequesEnCirculacion: TotalEnTransito;
  depositosEnTransito: TotalEnTransito;
  debitosEnTransito: TotalEnTransito;
  /** Efecto neto en libros; puede ser negativo. */
  erroresDelBanco: TotalEnTransito;
  saldoSegunBanco: string;
  ultimaConciliacion: MesDeConciliacion | null;
  atrasada: boolean;
  partidas: PartidaEnTransito[];
}

/** Un lado del balance, sin compensar con el otro. */
export interface TotalDeSaldos {
  cantidadDeCuentas: number;
  saldoEnLibros: string;
  chequesPosfechados: string;
  disponible: string;
}

export interface ReporteDeSaldosPorCuenta {
  fecha: string;
  cuentas: SaldoDeCuenta[];
  bancos: TotalDeSaldos;
  sobregiros: TotalDeSaldos;
  nota: string;
}

/** Fecha de corte y, si se quiere, una sola cuenta. */
export interface FiltroDeSaldos {
  fecha: string;
  cuentaBancariaId?: string;
  [clave: string]: string | undefined;
}

const RUTA = '/bancos/saldos-por-cuenta';

/** Saldos por cuenta: solo lectura, con su Excel. */
export class ApiSaldosPorCuenta {
  constructor(private readonly http: ClienteHttp) {}

  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  reporte(filtro: FiltroDeSaldos) {
    return this.http.obtener<ReporteDeSaldosPorCuenta>(RUTA, filtro);
  }
}

export const apiSaldosPorCuenta = new ApiSaldosPorCuenta(clienteHttp);
