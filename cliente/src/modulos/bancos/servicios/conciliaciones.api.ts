import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { Movimiento } from './movimientos.api';

export type EstadoDeConciliacion = 'en_proceso' | 'elaborada' | 'autorizada';

/** Conciliación en la lista de una cuenta. */
export interface ConciliacionResumen {
  id: string;
  anio: number;
  mes: number;
  estado: EstadoDeConciliacion;
  elaboradaEn: string | null;
  autorizadaEn: string | null;
}

export interface MovimientoConMarca extends Omit<Movimiento, 'puedeAnular' | 'puedeEliminar'> {
  marcado: boolean;
}

export interface Cuadratica {
  saldoInicial: string;
  ingresos: string;
  egresos: string;
  saldoFinal: string;
}

export interface Partida {
  movimientoId: string;
  fecha: string;
  monto: string;
  numeroDeCheque: number | null;
  beneficiario: string | null;
  referencia: string | null;
}

export interface PartidasDeConciliacion {
  chequesEnCirculacion: Partida[];
  otrosDebitosEnTransito: Partida[];
  creditosEnTransito: Partida[];
}

/** El documento de conciliación completo: encabezado, cuadro cuadrático, partidas y candidatos, ya resuelto por el servidor. */
export interface Conciliacion {
  id: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string | null;
  bancoNombre: string | null;
  numeroDeCuenta: string | null;
  empresaNombre: string | null;
  anio: number;
  mes: number;
  estado: EstadoDeConciliacion;
  elaboradaPorNombre: string | null;
  elaboradaEn: string | null;
  autorizadaPorNombre: string | null;
  autorizadaEn: string | null;
  candidatos: MovimientoConMarca[];
  cuadratica: { libros: Cuadratica; banco: Cuadratica };
  partidas: PartidasDeConciliacion;
  saldoQueDebeMostrarElEstadoDeCuenta: string;
}

export interface DatosDeInicioDeConciliacion {
  cuentaBancariaId: string;
  anio: number;
  mes: number;
}

/** Conciliación mensual por cuenta: sin Excel, todo desde la pantalla de conciliar; el usuario no escribe ningún saldo. */
export class ApiConciliaciones {
  constructor(private readonly http: ClienteHttp) {}

  listarDeLaCuenta(cuentaBancariaId: string) {
    return this.http.obtener<ConciliacionResumen[]>(`/bancos/cuentas-bancarias/${cuentaBancariaId}/conciliaciones`);
  }

  obtener(conciliacionId: string) {
    return this.http.obtener<Conciliacion>(`/bancos/conciliaciones/${conciliacionId}`);
  }

  iniciar(datos: DatosDeInicioDeConciliacion) {
    return this.http.crear<Conciliacion>('/bancos/conciliaciones', datos);
  }

  guardarMarcas(conciliacionId: string, movimientoIds: string[]) {
    return this.http.reemplazar<Conciliacion>(`/bancos/conciliaciones/${conciliacionId}/marcas`, { movimientoIds });
  }

  /** Termina la conciliación: pasa de en proceso a elaborada. */
  terminar(conciliacionId: string) {
    return this.http.crear<Conciliacion>(`/bancos/conciliaciones/${conciliacionId}/terminar`);
  }

  /** Autoriza la conciliación elaborada (no puede hacerlo quien la elaboró): congela el documento y bloquea el mes. */
  autorizar(conciliacionId: string) {
    return this.http.crear<Conciliacion>(`/bancos/conciliaciones/${conciliacionId}/autorizar`);
  }

  /** Devuelve una conciliación elaborada a en proceso, con motivo. */
  devolver(conciliacionId: string, motivo: string) {
    return this.http.crear<Conciliacion>(`/bancos/conciliaciones/${conciliacionId}/devolver`, { motivo });
  }

  /** Elimina la conciliación (solo la última de su cuenta); no se puede deshacer. */
  eliminar(conciliacionId: string, motivo: string) {
    return this.http.crear<void>(`/bancos/conciliaciones/${conciliacionId}/eliminar`, { motivo });
  }
}

export const apiConciliaciones = new ApiConciliaciones(clienteHttp);
