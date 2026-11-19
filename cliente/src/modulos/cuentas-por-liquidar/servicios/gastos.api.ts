import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  AsignacionDeGastos,
  DocumentoPorAsignar,
  FiltroDeBandeja,
  Gasto,
  GastoDeBandeja,
  SolicitudDeGastoSinDocumento,
} from './tipos-de-gastos';

export type * from './tipos-de-gastos';

const RUTA = '/cuentas-por-liquidar';

/** Los gastos de los anticipos y la bandeja de documentos que llegaron sin anticipo. */
export class ApiGastos {
  constructor(private readonly http: ClienteHttp) {}

  bandeja(filtro: FiltroDeBandeja = {}) {
    return this.http.obtener<GastoDeBandeja[]>(`${RUTA}/bandeja`, { ...filtro });
  }

  delAnticipo(anticipoId: string) {
    return this.http.obtener<Gasto[]>(`${RUTA}/anticipos/${anticipoId}/gastos`);
  }

  asignar(anticipoId: string, documentos: DocumentoPorAsignar[]) {
    return this.http.crear<AsignacionDeGastos>(`${RUTA}/anticipos/${anticipoId}/gastos/documentos`, { documentos });
  }

  sinDocumento(anticipoId: string, solicitud: SolicitudDeGastoSinDocumento) {
    return this.http.crear<Gasto>(`${RUTA}/anticipos/${anticipoId}/gastos/sin-documento`, solicitud);
  }

  quitar(gastoId: string, motivo: string) {
    return this.http.crear<Gasto>(`${RUTA}/gastos/${gastoId}/quitar`, { motivo });
  }
}

export const apiGastos = new ApiGastos(clienteHttp);
