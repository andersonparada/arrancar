import type { ClaseDeMejora, EstadoDeMejora } from '../../dominio/mejora.js';
import type { ClaseDeCostoElegible } from '../../dominio/tipos-de-costo.js';
import type { SolicitudDeCostoManual } from './costo.dto.js';

/** Una mejora o un costo posterior; `monto` es la suma de sus costos vigentes, con dos decimales. */
export interface MejoraDto {
  id: string;
  activoId: string;
  numero: number;
  anioDeNumero: number;
  clase: ClaseDeMejora;
  fecha: string;
  descripcion: string;
  vidaUtilRestanteContableMeses: number | null;
  noEsEdificacion: boolean;
  estado: EstadoDeMejora;
  anuladaEn: string | null;
  motivoDeAnulacion: string | null;
  monto: string;
  cantidadDeCostos: number;
}

/** Una parte de una línea del libro que se suma a la mejora, en centavos (negativa si es de una nota de crédito). */
export interface LineaDeMejora {
  lineaId: string;
  montoCentavos: number;
  claseDeCosto: ClaseDeCostoElegible | null;
}

/** Un costo escrito a mano de la mejora: su fecha y su marca de edificación son las de la mejora. */
export type CostoManualDeMejora = Omit<SolicitudDeCostoManual, 'fecha' | 'noEsEdificacion'>;

/** Lo que se recibe para registrar una mejora o un costo posterior: sus datos y los costos que agrupa. */
export interface SolicitudDeMejora {
  clase: ClaseDeMejora;
  fecha: string;
  descripcion: string;
  vidaUtilRestanteContableMeses: number | null;
  noEsEdificacion: boolean;
  lineas: LineaDeMejora[];
  costosManuales: CostoManualDeMejora[];
}

/** Lo que se recibe para revisar la estimación contable: la vida que queda y, si cambia, el residual (monto). */
export interface SolicitudDeRevisionDeEstimacion {
  vidaUtilRestanteMeses: number;
  valorResidual: string | null;
  /** Solo para constatar que no cambia: el porcentaje fiscal no se revisa (ISR arts. 27 y 28). */
  porcentajeFiscal?: string | null;
  motivo: string;
}

/** Lo que se recibe para cambiar la matrícula o el catastro de un edificio. */
export interface SolicitudDeValorFiscalDelInmueble {
  valorDeMatricula: string | null;
  valorCatastral: string | null;
  valoresDelInmuebleCompleto: boolean;
  motivo: string;
  documentoDeSoporte: string;
}
