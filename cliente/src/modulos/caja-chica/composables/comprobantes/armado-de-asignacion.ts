import type { ComprobanteDeLaBandeja, DocumentoPorAsignar } from '../../servicios/tipos-de-comprobantes';
import { centavosDe, sumarMontos } from '../dinero';

/** Lo que se escribe en la ventana de asignar: una fecha opcional y los motivos de las excepciones. */
export interface EdicionDeAsignacion {
  /** Vacía: cada documento entra con su fecha de emisión (lo decide el servidor). */
  fecha: string;
  motivoConRetencion: string;
  motivoSobreElTope: string;
}

export const edicionDeAsignacion = (): EdicionDeAsignacion => ({
  fecha: '',
  motivoConRetencion: '',
  motivoSobreElTope: '',
});

/** Una factura con retención solo se marca si quien consulta tiene el permiso de excepción. */
export const sePuedeMarcar = (documento: ComprobanteDeLaBandeja): boolean =>
  !documento.conRetencion || documento.puedeAsignarConRetencion;

/** Por qué un documento no se deja marcar; `null` si se puede. */
export function razonDeNoMarcar(documento: ComprobanteDeLaBandeja): string | null {
  return sePuedeMarcar(documento)
    ? null
    : 'Lleva retención: para pagarla de un fondo necesita el permiso de excepción. Pida a un administrador que la asigne.';
}

export const documentosConRetencion = (documentos: readonly ComprobanteDeLaBandeja[]): ComprobanteDeLaBandeja[] =>
  documentos.filter((documento) => documento.conRetencion);

/** Lo que va a pasar al asignar, para confirmarlo antes de enviar. */
export interface ResumenDeAsignacion {
  cantidad: number;
  /** Lo que sale del fondo: el neto de cada documento (las notas de crédito restan). */
  total: string;
  conRetencion: number;
  retenido: string;
  notasDeCredito: number;
}

export function resumenDeAsignacion(documentos: readonly ComprobanteDeLaBandeja[]): ResumenDeAsignacion {
  const conRetencion = documentosConRetencion(documentos);
  const centavos = (d: ComprobanteDeLaBandeja): number => (d.resta ? -1 : 1) * (centavosDe(d.monto) ?? 0);
  const total = documentos.reduce((suma, d) => suma + centavos(d), 0);
  return {
    cantidad: documentos.length,
    total: (total / 100).toFixed(2),
    conRetencion: conRetencion.length,
    retenido: sumarMontos(conRetencion.map((d) => d.montoRetenido)),
    notasDeCredito: documentos.filter((d) => d.resta).length,
  };
}

/**
 * Lo que falta escribir antes de enviar, por campo; vacío si está completo. El motivo de la retención se pide solo si
 * hay documentos con retención; el del tope no se exige de antemano: solo el servidor sabe qué documentos lo pasan.
 */
export function faltantesDeLaAsignacion(
  documentos: readonly ComprobanteDeLaBandeja[],
  edicion: EdicionDeAsignacion,
): Record<string, string> {
  const hayRetencion = documentosConRetencion(documentos).length > 0;
  return hayRetencion && !edicion.motivoConRetencion.trim()
    ? { motivoConRetencion: 'Escriba por qué se paga del fondo una factura con retención.' }
    : {};
}

const textoONulo = (texto: string): string | null => texto.trim() || null;

/** El cuerpo de asignar: el motivo de retención solo viaja en los documentos con retención (el servidor rechaza el resto). */
export function cuerpoDeAsignacion(
  documentos: readonly ComprobanteDeLaBandeja[],
  edicion: EdicionDeAsignacion,
): DocumentoPorAsignar[] {
  return documentos.map((documento) => ({
    comprobanteId: documento.id,
    fecha: textoONulo(edicion.fecha),
    motivoSobreElTope: textoONulo(edicion.motivoSobreElTope),
    motivoConRetencion: documento.conRetencion ? textoONulo(edicion.motivoConRetencion) : null,
  }));
}
