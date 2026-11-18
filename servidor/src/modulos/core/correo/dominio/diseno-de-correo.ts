import { sanearTexto } from './saneado.js';

export interface DatosDelDiseno {
  /** Texto ya con los marcadores reemplazados. */
  readonly mensaje: string;
  readonly empresa: string;
  readonly aplicacion: string;
  /** Si el correo lleva «Responder a» la empresa. */
  readonly conRespuesta: boolean;
}

export interface CuerposDeCorreo {
  readonly texto: string;
  readonly html: string;
}

const ENTIDADES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa un texto para ponerlo dentro de HTML (contenido y atributos). */
export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (caracter) => ENTIDADES[caracter] as string);
}

function pieDelCorreo({ empresa, aplicacion, conRespuesta }: DatosDelDiseno): string {
  const nombre = sanearTexto(empresa, 150);
  const medio = `Este correo lo envió ${nombre} por medio de ${sanearTexto(aplicacion, 80)}.`;
  return conRespuesta
    ? `${medio} Para responder, use Responder.`
    : `${medio} Para responder, comuníquese con ${nombre}.`;
}

function parrafosEnHtml(mensaje: string): string {
  return mensaje
    .split(/\n{2,}/)
    .filter((parrafo) => parrafo.trim() !== '')
    .map((parrafo) => `<p style="margin:0 0 12px">${escaparHtml(parrafo.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

/**
 * Diseño fijo del correo: todo dato va escapado, sin enlaces ni imágenes remotas (C9). Devuelve el texto
 * plano (el mensaje y el pie) y el HTML equivalente.
 */
export function armarCuerpos(datos: DatosDelDiseno): CuerposDeCorreo {
  const pie = pieDelCorreo(datos);
  const html = [
    '<!doctype html><html lang="es"><body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">',
    parrafosEnHtml(datos.mensaje),
    `<p style="margin:16px 0 0;font-size:12px;color:#666">${escaparHtml(pie)}</p>`,
    '</body></html>',
  ].join('\n');
  return { texto: `${datos.mensaje.trim()}\n\n--\n${pie}\n`, html };
}
