import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Clase de activo tal como lo manda el servidor. */
export interface Clase {
  id: string;
  nombre: string;
  incisoFiscal:
    | 'edificios'
    | 'plantaciones'
    | 'instalaciones_y_mobiliario'
    | 'maquinaria_y_vehiculos'
    | 'computo'
    | 'herramientas'
    | 'reproductores'
    | 'otros_muebles'
    | 'intangibles'
    | 'llave'
    | 'terrenos';
  porcentajeFiscal: string;
  vidaUtilContableMeses: number | null;
  valorResidualPorcentaje: string;
  activo: boolean;
}

export type DatosClase = Omit<Clase, 'id'>;

const RUTA = '/activos-fijos/clases';

export class ApiClases {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<Clase[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<Clase>(`${RUTA}/${id}`);
  }

  crear(datos: DatosClase) {
    return this.http.crear<Clase>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosClase) {
    return this.http.reemplazar<Clase>(`${RUTA}/${id}`, datos);
  }

  /** Solo si no tiene activos ni conceptos ligados; queda en la auditoría. */
  eliminar(id: string) {
    return this.http.eliminar(`${RUTA}/${id}`);
  }
}

export const apiClases = new ApiClases(clienteHttp);
