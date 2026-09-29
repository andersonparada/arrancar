import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Localidad tal como lo manda el servidor. */
export interface Localidad {
  id: string;
  codigo: string;
  nombre: string;
  tipoId: string;
  codigoEstablecimientoSat: number | null;
  nombreComercialSat: string | null;
  departamentoCodigo: string | null;
  municipioCodigo: string | null;
  direccion: string | null;
  activo: boolean;
  tipoNombre: string | null;
}

export type DatosLocalidad = Omit<Localidad, 'id' | 'tipoNombre'>;

const RUTA = '/empresas/localidades';

export class ApiLocalidades {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<Localidad[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<Localidad>(`${RUTA}/${id}`);
  }

  crear(datos: DatosLocalidad) {
    return this.http.crear<Localidad>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosLocalidad) {
    return this.http.reemplazar<Localidad>(`${RUTA}/${id}`, datos);
  }
}

export const apiLocalidades = new ApiLocalidades(clienteHttp);
