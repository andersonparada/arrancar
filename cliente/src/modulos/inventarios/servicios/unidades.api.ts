import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

export type Magnitud = 'cantidad' | 'masa' | 'volumen' | 'longitud' | 'superficie' | 'empaque';

/** Unidad de medida tal como la manda el servidor. */
export interface Unidad {
  id: string;
  nombre: string;
  simbolo: string;
  magnitud: Magnitud;
  factorALaReferencia: string | null;
  activo: boolean;
}

export type DatosUnidad = Omit<Unidad, 'id'>;

const RUTA = '/inventarios/unidades';

export class ApiUnidades {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<Unidad[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<Unidad>(`${RUTA}/${id}`);
  }

  crear(datos: DatosUnidad) {
    return this.http.crear<Unidad>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosUnidad) {
    return this.http.reemplazar<Unidad>(`${RUTA}/${id}`, datos);
  }

  /** Solo si ningún artículo la usa; queda en la auditoría. */
  eliminar(id: string) {
    return this.http.eliminar(`${RUTA}/${id}`);
  }
}

export const apiUnidades = new ApiUnidades(clienteHttp);
