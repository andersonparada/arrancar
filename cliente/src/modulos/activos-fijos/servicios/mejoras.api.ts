import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { ClaseDeCostoElegible } from './costos.api';

export type ClaseDeMejora = 'mejora' | 'costo_posterior';

/** Una mejora o un costo posterior; `monto` es la suma de sus costos vigentes, con dos decimales. */
export interface Mejora {
  id: string;
  activoId: string;
  numero: number;
  anioDeNumero: number;
  clase: ClaseDeMejora;
  fecha: string;
  descripcion: string;
  vidaUtilRestanteContableMeses: number | null;
  noEsEdificacion: boolean;
  estado: 'vigente' | 'anulada';
  anuladaEn: string | null;
  motivoDeAnulacion: string | null;
  monto: string;
  cantidadDeCostos: number;
}

/** Un costo escrito a mano de la mejora; su fecha y su marca de edificación son las de la mejora. */
export interface CostoManualDeMejora {
  claseDeCosto: ClaseDeCostoElegible;
  monto: string;
  documentoDeSoporte: string;
  descripcion: string | null;
  aplicaAlLibroFiscal: boolean;
  motivoFueraDelLibroFiscal: string | null;
}

/** Lo que se manda para registrar una mejora o un costo posterior. */
export interface DatosDeMejora {
  activoId: string;
  clase: ClaseDeMejora;
  fecha: string;
  descripcion: string;
  vidaUtilRestanteContableMeses: number | null;
  noEsEdificacion: boolean;
  costosManuales: CostoManualDeMejora[];
}

/** Lo que se manda para revisar la estimación contable (la vida que queda y, si cambia, el residual). */
export interface DatosDeRevisionDeEstimacion {
  vidaUtilRestanteMeses: number;
  valorResidual: string | null;
  motivo: string;
}

/** Lo que se manda para cambiar la matrícula o el catastro de un edificio. */
export interface DatosDeValorFiscalDelInmueble {
  valorDeMatricula: string | null;
  valorCatastral: string | null;
  valoresDelInmuebleCompleto: boolean;
  motivo: string;
  documentoDeSoporte: string;
}

const RUTA = '/activos-fijos/activos';

export class ApiMejoras {
  constructor(private readonly http: ClienteHttp) {}

  listar(activoId: string) {
    return this.http.obtener<Mejora[]>(`${RUTA}/${activoId}/mejoras`);
  }

  registrar(datos: DatosDeMejora) {
    return this.http.crear<Mejora>('/activos-fijos/mejoras', datos);
  }

  anular(mejoraId: string, motivo: string) {
    return this.http.crear<Mejora>(`/activos-fijos/mejoras/${mejoraId}/anular`, { motivo });
  }

  revisarEstimacion(activoId: string, datos: DatosDeRevisionDeEstimacion) {
    return this.http.crear<unknown>(`${RUTA}/${activoId}/revisar-estimacion`, datos);
  }

  cambiarValorFiscal(activoId: string, datos: DatosDeValorFiscalDelInmueble) {
    return this.http.crear<unknown>(`${RUTA}/${activoId}/valor-fiscal-del-inmueble`, datos);
  }
}

export const apiMejoras = new ApiMejoras(clienteHttp);
