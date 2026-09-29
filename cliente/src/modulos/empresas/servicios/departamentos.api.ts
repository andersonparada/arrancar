import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Departamento tal como lo manda el servidor. */
export interface Departamento {
  id: string;
  codigo: string;
  nombre: string;
  localidadId: string | null;
  activo: boolean;
  localidadNombre: string | null;
}

export type DatosDepartamento = Omit<Departamento, 'id' | 'localidadNombre'>;

const RUTA = '/empresas/departamentos';

export class ApiDepartamentos {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<Departamento[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<Departamento>(`${RUTA}/${id}`);
  }

  crear(datos: DatosDepartamento) {
    return this.http.crear<Departamento>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosDepartamento) {
    return this.http.reemplazar<Departamento>(`${RUTA}/${id}`, datos);
  }
}

export const apiDepartamentos = new ApiDepartamentos(clienteHttp);
