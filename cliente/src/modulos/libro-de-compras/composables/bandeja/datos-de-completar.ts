import type { DestinoDeDocumento } from '../../servicios/documentos.api';
import type { CambiosAlBorrador, DteRecibido, PeticionDeCompletar } from '../../servicios/dte-recibidos.api';
import { llevaFacturaAfectada } from '../documentos/tipos-de-documento-sat';

/** Lo que el usuario escoge en «Completar»: lo que deja vacío no se toca en ninguna de las filas. */
export interface EdicionDeCompletar {
  abierta: boolean;
  conceptoId: string | null;
  destino: DestinoDeDocumento | null;
  fechaRecepcion: string;
  /** Pone en cada fila su fecha de emisión como fecha de recepción. */
  usarFechaDeEmision: boolean;
  documentoAfectadoId: string | null;
}

export const edicionDeCompletarVacia = (): EdicionDeCompletar => ({
  abierta: false,
  conceptoId: null,
  destino: null,
  fechaRecepcion: '',
  usarFechaDeEmision: false,
  documentoAfectadoId: null,
});

/** Los cambios que se mandan: solo lo escogido. La fecha escrita pierde frente a «Usar la fecha de emisión». */
export function cambiosDeCompletar(edicion: EdicionDeCompletar): CambiosAlBorrador {
  const cambios: CambiosAlBorrador = {};
  if (edicion.conceptoId) cambios.conceptoId = edicion.conceptoId;
  if (edicion.destino) cambios.destino = edicion.destino;
  if (edicion.fechaRecepcion && !edicion.usarFechaDeEmision) cambios.fechaRecepcion = edicion.fechaRecepcion;
  if (edicion.documentoAfectadoId) cambios.documentoAfectadoId = edicion.documentoAfectadoId;
  return cambios;
}

export const peticionDeCompletar = (ids: string[], edicion: EdicionDeCompletar): PeticionDeCompletar => ({
  ids,
  cambios: cambiosDeCompletar(edicion),
  aplicarPropuestas: edicion.usarFechaDeEmision ? ['fechaRecepcion'] : [],
});

/** Hay algo escogido; sin eso, «Completar» no tiene nada que guardar. */
export const hayAlgoQueCompletar = (edicion: EdicionDeCompletar): boolean =>
  edicion.usarFechaDeEmision || Object.keys(cambiosDeCompletar(edicion)).length > 0;

/** La nota que se completa, si se marcó una sola: la factura que corrige es de cada nota y no se escoge en lote. */
export function notaPorCompletar(filas: readonly DteRecibido[]): DteRecibido | null {
  const [unica] = filas;
  return filas.length === 1 && unica && llevaFacturaAfectada(unica.tipoDte) ? unica : null;
}

/** Alguna de las filas es agente de retención del IVA y no tiene fecha de recepción propuesta. */
export const algunaPideLaRecepcion = (filas: readonly DteRecibido[]): boolean =>
  filas.some(({ propuesta }) => propuesta?.recepcionObligatoria === true);
