import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Combustible tal como lo manda el servidor. */
export interface Combustible {
  id: string;
  nombre: string;
  activo: boolean;
}

export type DatosCombustible = Omit<Combustible, 'id'>;

const RUTA = '/libro-de-compras/combustibles';

export class ApiCombustibles {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<Combustible[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<Combustible>(`${RUTA}/${id}`);
  }

  crear(datos: DatosCombustible) {
    return this.http.crear<Combustible>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosCombustible) {
    return this.http.reemplazar<Combustible>(`${RUTA}/${id}`, datos);
  }
}

export const apiCombustibles = new ApiCombustibles(clienteHttp);
