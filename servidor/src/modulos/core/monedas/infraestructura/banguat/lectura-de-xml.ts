import { RespuestaInvalida } from '../../dominio/errores.js';

const ENTIDADES_PROHIBIDAS = /<!\s*(DOCTYPE|ENTITY)/i;
const FALLA_SOAP = /<(?:[\w-]+:)?Fault[\s>]/;

/** El contenido del primer `<etiqueta>…</etiqueta>` (con o sin prefijo de espacio de nombres), recortado. */
export function textoDe(bloque: string, etiqueta: string): string | undefined {
  const patron = new RegExp(`<(?:[\\w-]+:)?${etiqueta}>([^<]*)</(?:[\\w-]+:)?${etiqueta}>`);
  return patron.exec(bloque)?.[1]?.trim();
}

/** Los contenidos de cada `<etiqueta>…</etiqueta>` (sin anidar el mismo nombre) del bloque. */
export function bloquesDe(bloque: string, etiqueta: string): string[] {
  const patron = new RegExp(`<(?:[\\w-]+:)?${etiqueta}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${etiqueta}>`, 'g');
  return [...bloque.matchAll(patron)].map((coincidencia) => coincidencia[1]!);
}

/**
 * Revisa que el XML sea seguro y traiga el resultado de `operacion`; devuelve lo que hay dentro de él.
 * Rechaza todo XML con `<!DOCTYPE` o `<!ENTITY` y no usa un analizador: solo se leen los elementos esperados.
 * @throws RespuestaInvalida si trae entidades, una falla SOAP o no tiene la estructura del servicio.
 */
export function resultadoDe(xml: string, operacion: string): string {
  if (ENTIDADES_PROHIBIDAS.test(xml)) throw new RespuestaInvalida('La respuesta del Banguat trae entidades XML.');
  if (FALLA_SOAP.test(xml)) throw new RespuestaInvalida('El Banguat respondió con una falla SOAP.');
  const resultado = bloquesDe(xml, `${operacion}Result`)[0];
  if (resultado !== undefined) return resultado;
  if (new RegExp(`<(?:[\\w-]+:)?${operacion}Result\\s*/>`).test(xml)) return '';
  throw new RespuestaInvalida(`La respuesta del Banguat no trae ${operacion}Result.`);
}

/** Cambia las cinco entidades predefinidas de XML por su carácter (`&amp;` al final, para no decodificar dos veces). */
export function sinEntidadesBasicas(texto: string): string {
  return texto
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}
