import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Vigencia de combustible tal como lo manda el servidor. */
export interface VigenciaDeCombustible {
  id: string;
  combustibleId: string;
  idpPorGalon: string;
  porcentajeDeEtanol: string;
  vigenteDesde: string;
  vigenteHasta: string | null;
  combustibleNombre: string | null;
}

export type DatosVigenciaDeCombustible = Omit<VigenciaDeCombustible, 'id' | 'combustibleNombre'>;

const RUTA = '/libro-de-compras/vigencias-de-combustible';

export class ApiVigenciasDeCombustible {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<VigenciaDeCombustible[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<VigenciaDeCombustible>(`${RUTA}/${id}`);
  }

  crear(datos: DatosVigenciaDeCombustible) {
    return this.http.crear<VigenciaDeCombustible>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosVigenciaDeCombustible) {
    return this.http.reemplazar<VigenciaDeCombustible>(`${RUTA}/${id}`, datos);
  }

  eliminar(id: string) {
    return this.http.eliminar(`${RUTA}/${id}`);
  }
}

export const apiVigenciasDeCombustible = new ApiVigenciasDeCombustible(clienteHttp);
