import type { LocationQuery } from 'vue-router';
import type { DestinoDeDocumento } from '../../servicios/documentos.api';

/**
 * A qué registro de un destino (el fondo de Caja chica, el anticipo…) va el documento, cuando el usuario llega a
 * Ingreso de facturas desde ese destino (`?destino=<clave>&referencia=<uuid>&etiqueta=<texto>&volver=</ruta>`). El libro no la
 * entiende: solo la pasa al destino al registrar. La etiqueta y la ruta de vuelta solo se muestran: no dan confianza.
 */
export interface ReferenciaDeDestino {
  /** El módulo destino; con él se fija el destino del documento (la referencia solo vale para ese módulo). */
  destino: DestinoDeDocumento | null;
  referencia: string | null;
  etiqueta: string | null;
  volver: string | null;
}

const DESTINOS: readonly DestinoDeDocumento[] = ['cuentas-por-pagar', 'caja-chica', 'cuentas-por-liquidar'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAXIMO_DE_ETIQUETA = 120;

function texto(valor: LocationQuery[string] | undefined): string | null {
  const primero = Array.isArray(valor) ? valor[0] : valor;
  return typeof primero === 'string' && primero.trim() !== '' ? primero.trim() : null;
}

/** Solo rutas de esta misma aplicación (`/algo`), nunca `//otro-sitio` ni con contrabarras. */
const esRutaInterna = (ruta: string): boolean => /^\/(?![/\\])[^\s\\]*$/.test(ruta);

/** Lo que la ruta dice del destino; sin `referencia` válida no hay nada (el formulario queda como siempre). */
export function referenciaDeLaRuta(query: LocationQuery): ReferenciaDeDestino {
  const referencia = texto(query.referencia);
  if (!referencia || !UUID.test(referencia)) return { destino: null, referencia: null, etiqueta: null, volver: null };
  const volver = texto(query.volver);
  return {
    destino: DESTINOS.find((clave) => clave === texto(query.destino)) ?? null,
    referencia: referencia.toLowerCase(),
    etiqueta: texto(query.etiqueta)?.slice(0, MAXIMO_DE_ETIQUETA) ?? null,
    volver: volver && esRutaInterna(volver) ? volver : null,
  };
}

/** A dónde va el usuario al terminar de registrar: de vuelta al destino que lo mandó, o a la ficha del documento. */
export type SalidaDelRegistro =
  { tipo: 'destino'; ruta: string } | { tipo: 'ficha'; documentoId: string } | { tipo: 'lista' };

export function salidaDelRegistro(volver: string | null, documentoId: string | null): SalidaDelRegistro {
  if (volver) return { tipo: 'destino', ruta: volver };
  return documentoId ? { tipo: 'ficha', documentoId } : { tipo: 'lista' };
}
