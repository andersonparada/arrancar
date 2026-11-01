import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { CausaDeAnulacion, DatosDeAnulacion, DocumentoPorPagar, FichaDelDocumento } from '../servicios/tipos';
import { CAUSAS_DE_ANULACION, MAXIMO_DEL_MOTIVO } from '../textos';
import { tituloDeDocumento } from './detalles-de-documento';

export const CODIGO_DE_LO_PROPIO = 'autorizacion_de_lo_propio';

/** Lo que se escribe en la ventana de anular; la causa vacía es «todavía no escogió». */
export interface EdicionDeAnulacion {
  abierta: boolean;
  causa: CausaDeAnulacion | '';
  motivo: string;
}

export const edicionDeAnulacionVacia = (): EdicionDeAnulacion => ({ abierta: false, causa: '', motivo: '' });

/** Las causas por nombre, con la invitación a escoger primero. */
export function opcionesDeCausa(): { valor: CausaDeAnulacion | ''; texto: string }[] {
  const causas = (Object.entries(CAUSAS_DE_ANULACION) as [CausaDeAnulacion, string][])
    .map(([valor, texto]) => ({ valor, texto }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }));
  return [{ valor: '', texto: 'Escoja la causa' }, ...causas];
}

/** El error del motivo (obligatorio, hasta 300 caracteres) o `null` si está bien. */
export function errorDelMotivo(motivo: string): string | null {
  const largo = motivo.trim().length;
  if (largo === 0) return 'Cuente brevemente qué pasó; así queda claro para quien revise.';
  return largo > MAXIMO_DEL_MOTIVO ? `Acórtelo a ${MAXIMO_DEL_MOTIVO} caracteres o menos.` : null;
}

/** Errores por campo antes de molestar al servidor; vacío si todo está bien. */
export function erroresDeAnulacion({ causa, motivo }: EdicionDeAnulacion): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!causa) errores.causa = 'Escoja por qué se anula el registro.';
  const errorDeMotivo = errorDelMotivo(motivo);
  if (errorDeMotivo) errores.motivo = errorDeMotivo;
  return errores;
}

/** El cuerpo de la solicitud; solo se llama con la edición ya validada. */
export const datosDeAnulacion = ({ causa, motivo }: EdicionDeAnulacion): DatosDeAnulacion => ({
  causa: causa as CausaDeAnulacion,
  motivo: motivo.trim(),
});

/** El error del vencimiento nuevo o `null` si está bien; el servidor revisa lo demás. */
export function errorDelVencimiento(vencimiento: string, fechaEmision: string): string | null {
  if (!vencimiento) return 'Escriba la fecha de vencimiento.';
  return vencimiento < fechaEmision
    ? `No puede ser anterior a la fecha de emisión (${formatearFecha(fechaEmision)}).`
    : null;
}

const describir = (documento: DocumentoPorPagar): string =>
  `${tituloDeDocumento(documento)} de ${documento.proveedorNombre} por ${formatearMonto(documento.total)}`;

/** Lo que va a pasar al anular, para que se lea antes de confirmar. */
export function resumenDeAnulacion(ficha: FichaDelDocumento): string {
  return `Se anulará el registro de ${describir(ficha)}, también en el libro de compras. Quedará como rastro y no se podrá deshacer.`;
}

/** La pregunta antes de eliminar; dice qué se pierde. */
export function mensajeDeEliminacion(ficha: FichaDelDocumento): string {
  return `¿Eliminar ${describir(ficha)}? Se borra por completo, también del libro de compras, y no se puede deshacer. Úselo solo si fue un error de captura; si no, anule el registro.`;
}

/** La pregunta antes de devolver un documento autorizado a «por autorizar». */
export const mensajeDeDesautorizacion = (ficha: FichaDelDocumento): string =>
  `${describir(ficha)} vuelve a «Por autorizar» y alguien tendrá que autorizarlo de nuevo. Cuente el motivo.`;

/** Quién no puede autorizar lo que ingresó o completó: el cliente solo lo explica, el servidor decide. */
export const avisoDeLoPropio =
  'Usted ingresó o completó este documento, así que debe autorizarlo otra persona (o alguien con el permiso de autorizar lo propio).';

/**
 * El servidor dice si se puede autorizar (`puedeAutorizar`); lo propio (`esPropio`) solo lo autoriza quien tiene el
 * permiso de autorizar lo propio. Aquí se decide si se ofrece la casilla; el servidor vuelve a revisar.
 */
export const sePuedeMarcarParaAutorizar = (documento: DocumentoPorPagar, puedeAutorizarPropios: boolean): boolean =>
  documento.puedeAutorizar && (!documento.esPropio || puedeAutorizarPropios);

/** Se podría autorizar, pero lo ingresó o completó el usuario y debe autorizarlo otra persona. */
export const esperaAOtraPersona = (documento: DocumentoPorPagar, puedeAutorizarPropios: boolean): boolean =>
  documento.puedeAutorizar && !sePuedeMarcarParaAutorizar(documento, puedeAutorizarPropios);

/** El mensaje del servidor cuando se intentó autorizar algo propio, o `null` si el error es otro. */
export function mensajeDeLoPropio(error: unknown): string | null {
  return error instanceof ErrorApi && error.codigo === CODIGO_DE_LO_PROPIO ? error.message : null;
}

/** Lo que va a pasar al autorizar, con cuánto se aprueba a pagar. */
export function resumenDeAutorizacion(documentos: readonly DocumentoPorPagar[]): string {
  const cargos = documentos.filter(({ clase }) => clase === 'cargo');
  const centavos = cargos.reduce((suma, { saldo }) => suma + Math.round(Number(saldo) * 100), 0);
  const cuantos = documentos.length === 1 ? 'el documento' : `los ${documentos.length} documentos`;
  const aprobado = cargos.length > 0 ? ` Se aprueban a pagar ${formatearMonto((centavos / 100).toFixed(2))}.` : '';
  return `Se autorizarán ${cuantos} marcados.${aprobado}`;
}
