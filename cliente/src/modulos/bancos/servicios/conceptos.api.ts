import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Concepto tal como lo manda el servidor. `claveDeSistema` es solo lectura: nulo en los del usuario. */
export interface Concepto {
  id: string;
  nombre: string;
  aplicaA: 'credito' | 'debito' | 'ambos';
  actividadDeFlujo: 'operacion' | 'inversion' | 'financiamiento' | 'ninguna';
  grupoDeFlujo: string | null;
  esCargoBancario: boolean;
  pideDatosDeIntereses: boolean;
  admiteFactura: boolean;
  activo: boolean;
  claveDeSistema: string | null;
}

export type DatosConcepto = Omit<Concepto, 'id' | 'claveDeSistema'>;

const RUTA = '/bancos/conceptos';

export class ApiConceptos {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<Concepto[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<Concepto>(`${RUTA}/${id}`);
  }

  crear(datos: DatosConcepto) {
    return this.http.crear<Concepto>(RUTA, datos);
  }

  /** Con él también se inactiva y se reactiva (campo `activo`). */
  actualizar(id: string, datos: DatosConcepto) {
    return this.http.reemplazar<Concepto>(`${RUTA}/${id}`, datos);
  }

  /** Solo si nadie lo usa; el motivo queda en la auditoría. */
  eliminar(id: string, motivo: string) {
    return this.http.eliminar(`${RUTA}/${id}`, { motivo });
  }
}

export const apiConceptos = new ApiConceptos(clienteHttp);
