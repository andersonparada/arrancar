import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';
import type { CondicionesDeProveedor } from './tipos';

/** Un proveedor de la cuenta con su plazo de crédito (`diasDeCredito` nulo es el plazo por omisión de la empresa). */
export interface PlazoDeProveedor extends CondicionesDeProveedor {
  proveedorId: string;
  nit: string | null;
  proveedorNombre: string;
}

const RUTA = '/cuentas-por-pagar/condiciones';

export class ApiPlazos {
  constructor(private readonly http: ClienteHttp) {}

  listar() {
    return this.http.obtener<PlazoDeProveedor[]>(RUTA);
  }

  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }
}

export const apiPlazos = new ApiPlazos(clienteHttp);
