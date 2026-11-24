import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { DatosDeMedicion } from './parcelas.api';

export type FuenteDeMedicion = DatosDeMedicion['fuente'];
export type UnidadOriginal = DatosDeMedicion['unidadOriginal'];

/** Medición de una parcela tal como la manda el servidor: la cifra original y los m² que resultaron de ella. */
export interface Medicion {
  id: string;
  parcelaId: string;
  vigenteDesde: string;
  fuente: FuenteDeMedicion;
  superficieTotalM2: string;
  superficieUtilM2: string;
  cantidadOriginal: string;
  unidadOriginal: UnidadOriginal;
  varasPorLadoDeCuerda: number | null;
  documento: string | null;
  estado: 'vigente' | 'anulada';
  anuladaEn: string | null;
  motivoDeAnulacion: string | null;
}

export class ApiMediciones {
  constructor(private readonly http: ClienteHttp) {}

  /** Registra una medición nueva; la parcela toma la más reciente que ya empezó. */
  registrar(parcelaId: string, datos: DatosDeMedicion) {
    return this.http.crear<Medicion>(`/parcelas/parcelas/${parcelaId}/mediciones`, datos);
  }

  /** Una medición no se borra: se anula con su motivo. */
  anular(medicionId: string, motivo: string) {
    return this.http.crear<Medicion>(`/parcelas/mediciones/${medicionId}/anular`, { motivo });
  }
}

export const apiMediciones = new ApiMediciones(clienteHttp);
