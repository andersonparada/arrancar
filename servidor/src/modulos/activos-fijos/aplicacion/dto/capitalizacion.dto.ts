import type { ClaseDeCostoElegible } from '../../dominio/tipos-de-costo.js';
import type { OrigenDeActivo } from '../../dominio/tipos-de-activo.js';

/** Un renglón de la cuadrícula de unidades; lo que falta se completa en la ficha (el código, con el correlativo). */
export interface DetalleDeUnidad {
  codigo: string | null;
  numeroDeSerie: string | null;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
}

/** El activo que nace de una asignación: `unidades` activos iguales de `cantidadPorActivo` piezas cada uno. */
export interface SolicitudDeActivoNuevo {
  descripcion: string;
  claseId: string;
  /** Las unidades heredan el mismo tipo de registro: un bien de control o un activo del balance. */
  tipoDeRegistro: 'activo' | 'bien_de_control';
  origen: OrigenDeActivo;
  activoPadreId: string | null;
  localidadId: string | null;
  departamentoId: string | null;
  responsable: string | null;
  enBodega: boolean;
  marca: string | null;
  modelo: string | null;
  valorComoGanadoComun: string | null;
  valorDeMatricula: string | null;
  valorCatastral: string | null;
  valoresDelInmuebleCompleto: boolean;
  observaciones: string | null;
  unidades: number;
  cantidadPorActivo: number;
  detalleDeUnidades: DetalleDeUnidad[];
}

/**
 * Una parte de una línea del libro, en centavos (negativa si la línea es de una nota de crédito), con su destino:
 * exactamente uno de `activoId` (un activo existente), `activoNuevo` (uno o varios nuevos) o `altaConjuntaId` (los
 * activos vigentes de una compra conjunta).
 */
export interface AsignacionDeLinea {
  lineaId: string;
  montoCentavos: number;
  activoId: string | null;
  activoNuevo: SolicitudDeActivoNuevo | null;
  altaConjuntaId: string | null;
  claseDeCosto: ClaseDeCostoElegible | null;
  /** «No es edificación ni requiere licencia»: solo en edificios (§3.5.1). */
  noEsEdificacion: boolean;
}

export interface SolicitudDeCapitalizacion {
  asignaciones: AsignacionDeLinea[];
}

/** Lo que se creó al capitalizar. */
export interface CapitalizacionDto {
  activos: { id: string; codigo: string; costo: string }[];
  costos: number;
  altaConjuntaIds: string[];
}
