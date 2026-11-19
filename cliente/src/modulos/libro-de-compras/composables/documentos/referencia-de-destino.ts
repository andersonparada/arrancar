import type { LocationQuery } from 'vue-router';

/**
 * A qué registro de un destino (el fondo de Caja chica, el anticipo…) va el documento, cuando el usuario llega a
 * Ingreso de facturas desde ese destino (`?referencia=<uuid>&etiqueta=<texto>&volver=</ruta>`). El libro no la
 * entiende: solo la pasa al destino al registrar. La etiqueta y la ruta de vuelta solo se muestran: no dan confianza.
 */
export interface ReferenciaDeDestino {
  referencia: string | null;
  etiqueta: string | null;
  volver: string | null;
}

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
  if (!referencia || !UUID.test(referencia)) return { referencia: null, etiqueta: null, volver: null };
  const volver = texto(query.volver);
  return {
    referencia: referencia.toLowerCase(),
    etiqueta: texto(query.etiqueta)?.slice(0, MAXIMO_DE_ETIQUETA) ?? null,
    volver: volver && esRutaInterna(volver) ? volver : null,
  };
}
