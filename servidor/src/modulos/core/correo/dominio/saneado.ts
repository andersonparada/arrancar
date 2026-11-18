const SALTO_DE_LINEA = 0x0a;
const TABULACION = 0x09;
const MAXIMO_DEL_ADJUNTO = 80;
const NO_PERMITIDOS_EN_ARCHIVO = /[\\/:*?"<>|]/g;

const RANGOS_PROHIBIDOS: ReadonlyArray<readonly [number, number]> = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
  [0x061c, 0x061c],
  [0x200e, 0x200f],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
];

/** Controles C0, DEL y C1, y los marcadores bidireccionales que sirven para disfrazar texto. */
export function esControlOBidireccional(codigo: number): boolean {
  return RANGOS_PROHIBIDOS.some(([desde, hasta]) => codigo >= desde && codigo <= hasta);
}

/** Indica si el texto trae algún control o marcador bidireccional. */
export function tieneControlesOBidireccionales(texto: string): boolean {
  return [...texto].some((caracter) => esControlOBidireccional(caracter.codePointAt(0) as number));
}

function quitarControles(texto: string, reemplazo: string, conservarSaltos: boolean): string {
  let resultado = '';
  for (const caracter of texto) {
    const codigo = caracter.codePointAt(0) as number;
    const respetar = conservarSaltos && (codigo === SALTO_DE_LINEA || codigo === TABULACION);
    resultado += esControlOBidireccional(codigo) && !respetar ? reemplazo : caracter;
  }
  return resultado;
}

/** Quita los controles (incluidos CR y LF), junta los espacios y corta al máximo: para asuntos y nombres. */
export function sanearTexto(texto: string, maximo: number): string {
  return quitarControles(texto, ' ', false).replace(/\s+/g, ' ').trim().slice(0, maximo).trim();
}

/** Quita los controles de un valor para el cuerpo, pero respeta saltos de línea y tabulaciones (CRLF pasa a LF). */
export function sanearParaCuerpo(texto: string): string {
  return quitarControles(texto.replace(/\r\n?/g, '\n'), '', true);
}

/** Nombre de adjunto seguro: sin controles ni separadores de ruta, máximo 80 y siempre con `.pdf`. */
export function sanearNombreDeAdjunto(nombre: string): string {
  const base = sanearTexto(nombre.replace(NO_PERMITIDOS_EN_ARCHIVO, ' '), 1000).replace(/(\.pdf)+$/i, '');
  const corto = base.slice(0, MAXIMO_DEL_ADJUNTO).replace(/^\.+/, '').trim();
  return `${corto || 'documento'}.pdf`;
}
