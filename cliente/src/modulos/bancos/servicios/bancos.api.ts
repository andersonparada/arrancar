import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Banco tal como lo manda el servidor. */
export interface Banco {
  id: string;
  nombre: string;
  observaciones: string | null;
  activo: boolean;
}

export type DatosBanco = Omit<Banco, 'id'>;

const RUTA = '/bancos/bancos';

export class ApiBancos {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<Banco[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<Banco>(`${RUTA}/${id}`);
  }

  crear(datos: DatosBanco) {
    return this.http.crear<Banco>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosBanco) {
    return this.http.reemplazar<Banco>(`${RUTA}/${id}`, datos);
  }
}

export const apiBancos = new ApiBancos(clienteHttp);
