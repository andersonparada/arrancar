import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Concepto de ingreso tal como lo manda el servidor. */
export interface ConceptoDeIngreso {
  id: string;
  nombre: string;
  tipo: 'bien' | 'servicio';
  /** Los de sistema (la venta de un activo fijo) no se editan, inactivan ni eliminan. */
  claveDeSistema: 'venta_de_activo_fijo' | null;
  activo: boolean;
}

export type DatosConceptoDeIngreso = Omit<ConceptoDeIngreso, 'id' | 'claveDeSistema'>;

const RUTA = '/libro-de-ventas/conceptos-de-ingreso';

export class ApiConceptosDeIngreso {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<ConceptoDeIngreso[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<ConceptoDeIngreso>(`${RUTA}/${id}`);
  }

  crear(datos: DatosConceptoDeIngreso) {
    return this.http.crear<ConceptoDeIngreso>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosConceptoDeIngreso) {
    return this.http.reemplazar<ConceptoDeIngreso>(`${RUTA}/${id}`, datos);
  }

  eliminar(id: string) {
    return this.http.eliminar(`${RUTA}/${id}`);
  }
}

export const apiConceptosDeIngreso = new ApiConceptosDeIngreso(clienteHttp);
