import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { CausaDeAnulacion, DatosDeAnulacion, FichaDeDocumento } from '../../servicios/documentos.api';
import { CAUSAS_DE_ANULACION } from '../../textos-de-documentos';
import { tituloDeDocumento } from './tipos-de-documento';

export const MAXIMO_DEL_MOTIVO = 300;

/**
 * Lo que se escribe en la ventana de anular; la causa vacía es «todavía no escogió». `fecha` solo se manda si la
 * SAT anuló el DTE; debe caer entre `desde` (la emisión) y `hasta` (hoy).
 */
export interface EdicionDeAnulacion {
  abierta: boolean;
  causa: CausaDeAnulacion | '';
  motivo: string;
  fecha: string;
  desde: string;
  hasta: string;
}

export const edicionDeAnulacionVacia = (): EdicionDeAnulacion => ({
  abierta: false,
  causa: '',
  motivo: '',
  fecha: '',
  desde: '',
  hasta: '',
});

/** La ventana abierta para esta factura: la fecha de la SAT empieza en hoy y no sale de [emisión, hoy]. */
export const edicionDeAnulacionAbierta = (emision: string, hoy: string): EdicionDeAnulacion => ({
  ...edicionDeAnulacionVacia(),
  abierta: true,
  fecha: hoy,
  desde: emision,
  hasta: hoy,
});

/** La fecha de la SAT solo se pide cuando la causa es que la SAT ya anuló el DTE. */
export const pideFechaDeLaSat = (causa: EdicionDeAnulacion['causa']): boolean => causa === 'fel_anulada_en_la_sat';

function errorDeFecha({ fecha, desde, hasta }: EdicionDeAnulacion): string | null {
  if (!fecha) return 'Escriba la fecha en que la SAT anuló el documento.';
  if (fecha < desde) return `No puede ser anterior a la emisión (${formatearFecha(desde)}).`;
  if (fecha > hasta) return 'No puede ser posterior a hoy.';
  return null;
}

/** Las causas por nombre, con la invitación a escoger primero. */
export function opcionesDeCausa(): { valor: CausaDeAnulacion | ''; texto: string }[] {
  const causas = (Object.entries(CAUSAS_DE_ANULACION) as [CausaDeAnulacion, string][])
    .map(([valor, texto]) => ({ valor, texto }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }));
  return [{ valor: '', texto: 'Escoja la causa' }, ...causas];
}

/** Errores por campo antes de molestar al servidor; vacío si todo está bien. */
export function erroresDeAnulacion(edicion: EdicionDeAnulacion): Record<string, string> {
  const { causa, motivo } = edicion;
  const errores: Record<string, string> = {};
  if (!causa) errores.causa = 'Escoja por qué se anula el registro.';
  const largo = motivo.trim().length;
  if (largo === 0) errores.motivo = 'Cuente brevemente qué pasó; así queda claro para quien revise el libro.';
  else if (largo > MAXIMO_DEL_MOTIVO) errores.motivo = `Acórtelo a ${MAXIMO_DEL_MOTIVO} caracteres o menos.`;
  const errorFecha = pideFechaDeLaSat(causa) ? errorDeFecha(edicion) : null;
  if (errorFecha) errores.fechaDeAnulacion = errorFecha;
  return errores;
}

/** El cuerpo de la solicitud; solo se llama con la edición ya validada. */
export function datosDeAnulacion({ causa, motivo, fecha }: EdicionDeAnulacion): DatosDeAnulacion {
  const datos = { causa: causa as CausaDeAnulacion, motivo: motivo.trim() };
  return pideFechaDeLaSat(causa) ? { ...datos, fechaDeAnulacion: fecha } : datos;
}

const descripcion = (ficha: FichaDeDocumento): string =>
  `${tituloDeDocumento(ficha)} de ${ficha.nombreReceptor} por ${formatearMonto(ficha.totales.total)}`;

/** Lo que va a pasar al anular, para que el usuario lo lea antes de confirmar. */
export function resumenDeAnulacion(ficha: FichaDeDocumento): string {
  const cartera = ficha.destino ? ' Su cargo en cuentas por cobrar también se anula si no tiene cobros.' : '';
  return `Se anulará el registro de ${descripcion(ficha)}. Quedará como rastro en el libro y no se podrá deshacer.${cartera}`;
}

/** La pregunta antes de eliminar; dice qué se pierde. */
export function mensajeDeEliminacion(ficha: FichaDeDocumento): string {
  return `¿Eliminar ${descripcion(ficha)}? Se borra por completo, con sus líneas, y no se puede deshacer. Úselo solo si fue un error de captura; si no, anule el registro.`;
}

/**
 * Por qué no se ofrece anular o eliminar un documento vigente, con los datos que trae la ficha. Solo explica: la
 * decisión de poder o no poder la toma el servidor (`puedeAnular`, `puedeEliminar`).
 */
export function explicacionesDeAcciones(ficha: FichaDeDocumento): string[] {
  if (ficha.estado !== 'vigente') return [];
  const explicaciones: string[] = [];
  const vigentes = ficha.notas.filter((nota) => nota.estado === 'vigente');
  if (!ficha.puedeAnular && vigentes.length > 0) {
    explicaciones.push('Para anular esta factura, primero anule las notas que la corrigen.');
  }
  if (!ficha.puedeEliminar && ficha.procesado) {
    explicaciones.push('No se puede eliminar: la cartera ya lo procesó. Si hace falta, anule el registro.');
  } else if (!ficha.puedeEliminar && ficha.notas.length > 0) {
    explicaciones.push('No se puede eliminar porque tiene notas, aunque estén anuladas.');
  }
  return explicaciones;
}
