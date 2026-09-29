import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Tipo de localidad tal como lo manda el servidor. */
export interface TipoDeLocalidad {
  id: string;
  nombre: string;
  activo: boolean;
}

export type DatosTipoDeLocalidad = Omit<TipoDeLocalidad, 'id'>;

const RUTA = '/empresas/tipos-de-localidad';

export class ApiTiposDeLocalidad {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<TipoDeLocalidad[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<TipoDeLocalidad>(`${RUTA}/${id}`);
  }

  crear(datos: DatosTipoDeLocalidad) {
    return this.http.crear<TipoDeLocalidad>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosTipoDeLocalidad) {
    return this.http.reemplazar<TipoDeLocalidad>(`${RUTA}/${id}`, datos);
  }

  /** Falla con 409 si el tipo ya lo usa alguna localidad. */
  eliminar(id: string) {
    return this.http.eliminar(`${RUTA}/${id}`);
  }
}

export const apiTiposDeLocalidad = new ApiTiposDeLocalidad(clienteHttp);
