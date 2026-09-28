import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Movimiento tal como lo manda el servidor. */
export interface Movimiento {
  id: string;
  cuentaBancariaId: string;
  tipo: 'credito' | 'debito';
  fecha: string;
  monto: string;
  saldoInicial: boolean;
  referencia: string | null;
  beneficiario: string | null;
  observaciones: string | null;
  cuentaBancariaNombre: string | null;
}

export type DatosMovimiento = Omit<Movimiento, 'id' | 'cuentaBancariaNombre'>;

const RUTA = '/bancos/movimientos';

export class ApiMovimientos {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<Movimiento[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<Movimiento>(`${RUTA}/${id}`);
  }

  crear(datos: DatosMovimiento) {
    return this.http.crear<Movimiento>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosMovimiento) {
    return this.http.reemplazar<Movimiento>(`${RUTA}/${id}`, datos);
  }

  eliminar(id: string) {
    return this.http.eliminar(`${RUTA}/${id}`);
  }
}

export const apiMovimientos = new ApiMovimientos(clienteHttp);
