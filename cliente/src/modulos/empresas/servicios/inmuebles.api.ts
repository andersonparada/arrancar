import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Inmueble tal como lo manda el servidor. */
export interface Inmueble {
  id: string;
  nombre: string;
  situacionRegistral: 'inscrito' | 'posesorio';
  registro: 'general' | 'segundo' | null;
  numeroDeFinca: string | null;
  folio: string | null;
  libro: string | null;
  departamentoRegistral: string | null;
  documentoPosesorio: string | null;
  titulacionSupletoriaEnTramite: boolean;
  titularidad: 'propia' | 'copropiedad' | 'de_tercero';
  porcentajeDeCopropiedad: string | null;
  titular: string | null;
  matriculaFiscal: string | null;
  administraIusi: 'dicabi' | 'municipalidad' | null;
  codigoCatastral: string | null;
  departamentoCodigo: string | null;
  municipioCodigo: string | null;
  direccion: string | null;
  superficieRegistralM2: string | null;
  cantidadOriginal: string | null;
  unidadOriginal: 'm2' | 'hectarea' | 'manzana' | 'cuerda' | 'vara_cuadrada' | 'caballeria' | null;
  varasPorLadoDeCuerda: number | null;
  localidadId: string | null;
  observaciones: string | null;
  activo: boolean;
  localidadNombre: string | null;
}

export type DatosInmueble = Omit<Inmueble, 'id' | 'localidadNombre' | 'activo'>;

const RUTA = '/empresas/inmuebles';

export class ApiInmuebles {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<Inmueble[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<Inmueble>(`${RUTA}/${id}`);
  }

  crear(datos: DatosInmueble) {
    return this.http.crear<Inmueble>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosInmueble) {
    return this.http.reemplazar<Inmueble>(`${RUTA}/${id}`, datos);
  }

  inactivar(id: string) {
    return this.http.crear<Inmueble>(`${RUTA}/${id}/inactivar`, {});
  }

  reactivar(id: string) {
    return this.http.crear<Inmueble>(`${RUTA}/${id}/reactivar`, {});
  }

  eliminar(id: string) {
    return this.http.eliminar(`${RUTA}/${id}`);
  }
}

export const apiInmuebles = new ApiInmuebles(clienteHttp);
