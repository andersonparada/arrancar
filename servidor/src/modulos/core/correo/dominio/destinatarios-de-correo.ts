import { DireccionDeEnvio } from './direccion-de-envio.js';
import { DemasiadosDestinatarios, SinDestinatarios } from './errores-de-la-bandeja.js';
import { sanearTexto } from './saneado.js';

export const MAXIMO_DE_DESTINATARIOS = 10;
const MAXIMO_DEL_NOMBRE = 150;

export type ClaseDeDestinatario = 'para' | 'copia';
export type OrigenDeDestinatario = 'tercero' | 'contacto' | 'empresa' | 'usuario';

/** A quién va el correo, tal como lo resuelve el módulo que lo pide: siempre una dirección ya registrada. */
export interface DestinatarioPorEncolar {
  readonly direccion: string;
  readonly nombre: string | null;
  readonly clase: ClaseDeDestinatario;
  readonly origen: OrigenDeDestinatario;
  readonly origenId: string | null;
}

/** Un destinatario validado: dirección normalizada y nombre saneado. */
export interface Destinatario {
  readonly direccion: DireccionDeEnvio;
  readonly nombre: string | null;
  readonly clase: ClaseDeDestinatario;
  readonly origen: OrigenDeDestinatario;
  readonly origenId: string | null;
}

function validar(destinatario: DestinatarioPorEncolar): Destinatario {
  const nombre = destinatario.nombre === null ? '' : sanearTexto(destinatario.nombre, MAXIMO_DEL_NOMBRE);
  return {
    direccion: DireccionDeEnvio.crear(destinatario.direccion),
    nombre: nombre === '' ? null : nombre,
    clase: destinatario.clase,
    origen: destinatario.origen,
    origenId: destinatario.origenId,
  };
}

/**
 * Valida cada dirección con la regla estricta de envío (C6), junta las repetidas (si una va como «para» y como
 * «copia», queda «para») y exige entre 1 y 10 destinatarios, al menos uno «para».
 * @throws DireccionNoUtilizable, SinDestinatarios, DemasiadosDestinatarios
 */
export function normalizarDestinatarios(entrada: readonly DestinatarioPorEncolar[]): Destinatario[] {
  const unicos = new Map<string, Destinatario>();
  for (const destinatario of entrada.map(validar)) {
    const llave = destinatario.direccion.valor.toLowerCase();
    const previo = unicos.get(llave);
    if (!previo || (previo.clase === 'copia' && destinatario.clase === 'para')) unicos.set(llave, destinatario);
  }
  const lista = [...unicos.values()];
  if (!lista.some((d) => d.clase === 'para')) throw new SinDestinatarios();
  if (lista.length > MAXIMO_DE_DESTINATARIOS) throw new DemasiadosDestinatarios(MAXIMO_DE_DESTINATARIOS);
  return lista;
}
