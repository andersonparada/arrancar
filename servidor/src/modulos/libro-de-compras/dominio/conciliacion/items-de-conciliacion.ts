import { diferenciasDeConciliacion } from './diferencias.js';
import type { DocumentoConciliable, FilaConciliable, ItemDeConciliacion } from './tipos-de-conciliacion.js';

const SIN_SITUACION = {
  estadoEnLaBandeja: null,
  motivoDeBloqueo: null,
  motivoDeDescarte: null,
} as const satisfies Partial<ItemDeConciliacion>;

/** Una línea desde el documento de Arrancar; con su fila, trae la situación de la fila y los datos que difieren. */
export function itemDelDocumento(documento: DocumentoConciliable, fila: FilaConciliable | null): ItemDeConciliacion {
  return {
    autorizacionFel: documento.autorizacionFel,
    tipoDte: documento.tipoDte,
    serie: documento.serie,
    numero: documento.numero,
    fechaEmision: documento.fechaEmision,
    nitEmisor: documento.nitEmisor,
    nombreEmisor: documento.nombreEmisor,
    total: documento.total,
    iva: documento.iva,
    documentoId: documento.id,
    dteId: fila?.id ?? null,
    periodoDelDocumento: documento.periodo,
    documentoFueraDelLibro: documento.fueraDelLibro,
    ...(fila ? situacionDe(fila) : SIN_SITUACION),
    diferencias: fila ? diferenciasDeConciliacion(documento, fila) : [],
  };
}

/** Una línea desde la fila de la SAT; con un documento de otro período trae cuál es y su período. */
export function itemDeLaFila(fila: FilaConciliable, documento: DocumentoConciliable | null): ItemDeConciliacion {
  return {
    autorizacionFel: fila.autorizacionFel,
    tipoDte: fila.tipoDte,
    serie: fila.serie,
    numero: fila.numero,
    fechaEmision: fila.fechaEmision,
    nitEmisor: fila.nitEmisor,
    nombreEmisor: fila.nombreEmisor,
    total: fila.total,
    iva: fila.iva,
    documentoId: documento?.id ?? null,
    dteId: fila.id,
    periodoDelDocumento: documento?.periodo ?? null,
    documentoFueraDelLibro: documento?.fueraDelLibro ?? false,
    ...situacionDe(fila),
    diferencias: [],
  };
}

function situacionDe(fila: FilaConciliable) {
  return {
    estadoEnLaBandeja: fila.estado,
    motivoDeBloqueo: fila.motivoDeBloqueo,
    motivoDeDescarte: fila.motivoDeDescarte,
  };
}
