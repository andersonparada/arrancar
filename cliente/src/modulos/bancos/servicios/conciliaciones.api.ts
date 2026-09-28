import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { Movimiento } from './movimientos.api';

/** Conciliación en la lista de una cuenta. */
export interface ConciliacionResumen {
  id: string;
  anio: number;
  mes: number;
  saldoSegunBanco: string;
  cerrada: boolean;
}

export interface MovimientoConMarca extends Movimiento {
  marcado: boolean;
}

/** La conciliación con sus movimientos candidatos y el cálculo ya resuelto por el servidor. */
export interface Conciliacion {
  id: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string | null;
  anio: number;
  mes: number;
  saldoSegunBanco: string;
  saldoAnterior: string;
  movimientos: MovimientoConMarca[];
  saldoConciliado: string;
  diferencia: string;
  cerrada: boolean;
}

export interface DatosDeInicioDeConciliacion {
  cuentaBancariaId: string;
  anio: number;
  mes: number;
  saldoSegunBanco: string;
}

/** Conciliación mensual por cuenta: sin Excel, todo desde la pantalla de conciliar. */
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

  cambiarSaldo(conciliacionId: string, saldoSegunBanco: string) {
    return this.http.reemplazar<Conciliacion>(`/bancos/conciliaciones/${conciliacionId}/saldo`, { saldoSegunBanco });
  }

  cerrar(conciliacionId: string) {
    return this.http.crear<Conciliacion>(`/bancos/conciliaciones/${conciliacionId}/cerrar`);
  }

  /** Elimina la conciliación (solo la última de su cuenta); no se puede deshacer. */
  eliminar(conciliacionId: string, motivo: string) {
    return this.http.crear<void>(`/bancos/conciliaciones/${conciliacionId}/eliminar`, { motivo });
  }
}

export const apiConciliaciones = new ApiConciliaciones(clienteHttp);
