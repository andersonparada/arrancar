import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Concepto de gasto tal como lo manda el servidor. */
export interface ConceptoDeGasto {
  id: string;
  nombre: string;
  tipoPorOmision: 'bien' | 'servicio';
  esProductoAgropecuario: boolean;
  esActivoFijo: boolean;
  activo: boolean;
}

export type DatosConceptoDeGasto = Omit<ConceptoDeGasto, 'id'>;

const RUTA = '/libro-de-compras/conceptos-de-gasto';

export class ApiConceptosDeGasto {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<ConceptoDeGasto[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<ConceptoDeGasto>(`${RUTA}/${id}`);
  }

  crear(datos: DatosConceptoDeGasto) {
    return this.http.crear<ConceptoDeGasto>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosConceptoDeGasto) {
    return this.http.reemplazar<ConceptoDeGasto>(`${RUTA}/${id}`, datos);
  }
}

export const apiConceptosDeGasto = new ApiConceptosDeGasto(clienteHttp);
