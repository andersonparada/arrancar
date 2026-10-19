import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  CausaDeAnulacion,
  DatosDeAnulacion,
  FichaDeDocumento,
  TipoDeDocumento,
} from '../../servicios/documentos.api';
import { CAUSAS_DE_ANULACION, textoDeCausa } from '../../textos-de-documentos';
import { tituloDeDocumento } from './detalles-de-documento';

export const MAXIMO_DEL_MOTIVO = 300;

/** Lo que se escribe en la ventana de anular; la causa vacía es «todavía no escogió». */
export interface EdicionDeAnulacion {
  abierta: boolean;
  causa: CausaDeAnulacion | '';
  motivo: string;
}

export const edicionDeAnulacionVacia = (): EdicionDeAnulacion => ({ abierta: false, causa: '', motivo: '' });

/** Las causas por nombre, con la invitación a escoger primero; en una factura especial el emisor es la empresa. */
export function opcionesDeCausa(tipo?: TipoDeDocumento): { valor: CausaDeAnulacion | ''; texto: string }[] {
  const causas = (Object.keys(CAUSAS_DE_ANULACION) as CausaDeAnulacion[])
    .map((valor) => ({ valor, texto: textoDeCausa(valor, tipo ?? 'factura') }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }));
  return [{ valor: '', texto: 'Escoja la causa' }, ...causas];
}

/** Errores por campo antes de molestar al servidor; vacío si todo está bien. */
export function erroresDeAnulacion({ causa, motivo }: EdicionDeAnulacion): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!causa) errores.causa = 'Escoja por qué se anula el registro.';
  const largo = motivo.trim().length;
  if (largo === 0) errores.motivo = 'Cuente brevemente qué pasó; así queda claro para quien revise el libro.';
  else if (largo > MAXIMO_DEL_MOTIVO) errores.motivo = `Acórtelo a ${MAXIMO_DEL_MOTIVO} caracteres o menos.`;
  return errores;
}

/** El cuerpo de la solicitud; solo se llama con la edición ya validada. */
export function datosDeAnulacion({ causa, motivo }: EdicionDeAnulacion): DatosDeAnulacion {
  return { causa: causa as CausaDeAnulacion, motivo: motivo.trim() };
}

/** Lo que va a pasar al anular, para que el usuario lo lea antes de confirmar. */
export function resumenDeAnulacion(ficha: FichaDeDocumento): string {
  const documento = `${tituloDeDocumento(ficha)} de ${ficha.nombreEmisor} por ${formatearMonto(ficha.totales.total)}`;
  const retenido = ficha.retenciones.length > 0 ? ' Sus retenciones quedan guardadas en el registro anulado.' : '';
  return `Se anulará el registro de ${documento}. Quedará como rastro en el libro y no se podrá deshacer.${retenido}`;
}

/**
 * Por qué no se ofrece anular o eliminar un documento vigente, con los datos que trae la ficha. Solo explica: la
 * decisión de poder o no poder la toma el servidor (`puedeAnular`, `puedeEliminar`).
 */
export function explicacionesDeAcciones(ficha: FichaDeDocumento): string[] {
  if (ficha.estado !== 'vigente') return [];
  const explicaciones: string[] = [];
  if (!ficha.puedeAnular && ficha.notas.some((nota) => nota.estado === 'vigente')) {
    explicaciones.push('Para anular esta factura, primero anule sus notas de crédito vigentes.');
  }
  if (!ficha.puedeEliminar && ficha.procesadoEnDestinoEn) {
    const cuando = formatearFecha(ficha.procesadoEnDestinoEn);
    explicaciones.push(
      `No se puede eliminar: el destino ya la procesó el ${cuando}. Si hace falta, anule el registro.`,
    );
  } else if (!ficha.puedeEliminar && ficha.notas.length > 0) {
    explicaciones.push('No se puede eliminar porque tiene notas de crédito, aunque estén anuladas.');
  }
  return explicaciones;
}

/** La pregunta antes de eliminar; dice qué se pierde. */
export function mensajeDeEliminacion(ficha: FichaDeDocumento): string {
  const documento = `${tituloDeDocumento(ficha)} de ${ficha.nombreEmisor} por ${formatearMonto(ficha.totales.total)}`;
  return `¿Eliminar ${documento}? Se borra por completo, con sus líneas y retenciones, y no se puede deshacer. Úselo solo si fue un error de captura; si no, anule el registro.`;
}
