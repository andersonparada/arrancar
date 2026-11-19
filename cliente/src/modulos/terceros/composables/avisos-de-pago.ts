import type { DatosContacto } from '../servicios/terceros.api';

const ATEXTO = "[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+";
const PARTE_LOCAL = new RegExp(`^${ATEXTO}(\\.${ATEXTO})*$`);
const ETIQUETA = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
const TLD = /^[a-z]{2,63}$/i;

/** Reflejo de `DireccionDeEnvio` del servidor, solo para avisar antes; el servidor decide. */
function sirveParaEnviar(correo: string): boolean {
  const partes = correo.split('@');
  if (partes.length !== 2 || correo.length > 254) return false;
  const [local, dominio] = partes as [string, string];
  const etiquetas = dominio.split('.');
  return (
    local.length <= 64 &&
    PARTE_LOCAL.test(local) &&
    etiquetas.length >= 2 &&
    etiquetas.every((etiqueta) => ETIQUETA.test(etiqueta)) &&
    TLD.test(etiquetas[etiquetas.length - 1] as string)
  );
}

/**
 * Por qué un contacto no puede recibir avisos de pago, o `null` si puede. El texto dice cómo corregirlo.
 */
export function motivoSinAvisosDePago(correo: string | null): string | null {
  const texto = correo?.trim() ?? '';
  if (!texto) return 'Escriba el correo del contacto para poder activarlo.';
  if (!sirveParaEnviar(texto)) {
    return 'Este correo no sirve para enviar avisos (solo letras, números y signos habituales, sin espacios ni acentos). Corríjalo para activarlo.';
  }
  return null;
}

/** La marca que se envía: si el correo no sirve, va apagada (el servidor la quitaría igual). */
export function conAvisosCoherentes(contacto: DatosContacto): DatosContacto {
  const sirve = motivoSinAvisosDePago(contacto.correo) === null;
  return { ...contacto, recibeAvisosDePago: contacto.recibeAvisosDePago && sirve };
}
