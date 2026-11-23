import type { DatosDeMedicion, FuenteDeMedicion } from '../../dominio/medicion.js';
import type { UnidadDeSuperficie } from '../../dominio/superficie.js';

/** Medición de una parcela tal como la ve el usuario. */
export interface MedicionDto {
  id: string;
  parcelaId: string;
  vigenteDesde: string;
  fuente: FuenteDeMedicion;
  superficieTotalM2: string;
  superficieUtilM2: string;
  cantidadOriginal: string;
  unidadOriginal: UnidadDeSuperficie;
  varasPorLadoDeCuerda: number | null;
  documento: string | null;
  estado: 'vigente' | 'anulada';
  anuladaEn: string | null;
  motivoDeAnulacion: string | null;
}

/** Lo que se recibe para registrar una medición, ya validado en su forma. */
export type SolicitudDeMedicion = DatosDeMedicion;

/** Lo que se recibe para anular una medición. */
export interface SolicitudDeAnulacionDeMedicion {
  motivo: string;
}
