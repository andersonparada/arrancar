import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Cuenta bancaria tal como lo manda el servidor. */
export interface CuentaBancaria {
  id: string;
  nombre: string;
  bancoId: string;
  numero: string;
  tipo: 'monetaria' | 'ahorro';
  observaciones: string | null;
  activo: boolean;
  bancoNombre: string | null;
}

export type DatosCuentaBancaria = Omit<CuentaBancaria, 'id' | 'bancoNombre'>;

const RUTA = '/bancos/cuentas-bancarias';

export class ApiCuentasBancarias {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<CuentaBancaria[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<CuentaBancaria>(`${RUTA}/${id}`);
  }

  crear(datos: DatosCuentaBancaria) {
    return this.http.crear<CuentaBancaria>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosCuentaBancaria) {
    return this.http.reemplazar<CuentaBancaria>(`${RUTA}/${id}`, datos);
  }
}

export const apiCuentasBancarias = new ApiCuentasBancarias(clienteHttp);
