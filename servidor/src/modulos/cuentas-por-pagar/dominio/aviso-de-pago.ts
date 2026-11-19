import { DireccionDeEnvio } from '../../core/correo/dominio/direccion-de-envio.js';
import { PlantillaDeCorreo } from '../../core/correo/dominio/plantilla-de-correo.js';
import { MarcadorDesconocido } from '../../core/correo/dominio/errores-de-correo.js';
import type { FormaDePago } from './pagos.js';

/** El recurso y el tipo con que el aviso queda en la bandeja de correo de core. */
export const RECURSO_DE_AVISOS = 'cuentas-por-pagar.pagos';
export const TIPO_DE_AVISO = 'cuentas-por-pagar.aviso_de_pago';
export const MOTIVO_DE_CANCELACION_POR_ANULACION = 'Pago anulado';

/** El asunto no admite el monto ni los documentos (minimización de datos, P6). */
export const MARCADORES_DEL_ASUNTO = ['proveedor', 'empresa', 'numero', 'fecha', 'forma', 'fecha_de_cobro'] as const;
export const MARCADORES_DEL_MENSAJE = [...MARCADORES_DEL_ASUNTO, 'monto', 'documentos', 'adjunto'] as const;

/** Lo que dice el marcador `{adjunto}`: la frase solo si el correo lleva el comprobante (con su espacio final). */
export const FRASE_DEL_ADJUNTO = 'Adjuntamos el comprobante del pago. ';

const MAXIMO_DE_DOCUMENTOS_EN_EL_TEXTO = 20;

/** Las formas que mandan aviso: todas menos la cuenta de apertura (la carga del sistema anterior). */
const FORMAS_CON_AVISO: readonly FormaDePago[] = ['cheque', 'nota_de_debito', 'nota_ligada', 'efectivo'];

const FORMAS_EN_EL_TEXTO: Record<FormaDePago, string> = {
  cheque: 'cheque',
  nota_de_debito: 'nota de débito',
  nota_ligada: 'débito ya registrado',
  cuenta_de_apertura: 'cuenta de apertura',
  efectivo: 'efectivo',
};

export const textoDeLaForma = (forma: FormaDePago): string => FORMAS_EN_EL_TEXTO[forma];

/** Por qué un pago no admite aviso, o `null` si lo admite. */
export function motivoSinAviso(pago: { forma: FormaDePago; estado: 'vigente' | 'anulado' }): string | null {
  if (pago.estado === 'anulado') return 'El pago está anulado.';
  if (!FORMAS_CON_AVISO.includes(pago.forma)) return 'Un pago a la cuenta de apertura no lleva aviso.';
  return null;
}

/** De dónde sale la dirección: el correo principal del proveedor o el de uno de sus contactos. */
export type OrigenDelDestinatario = 'tercero' | 'contacto';

/** Una dirección ya registrada a la que se le puede mandar el aviso. */
export interface DestinatarioPosible {
  origen: OrigenDelDestinatario;
  origenId: string;
  nombre: string;
  direccion: string;
  /** Falso si la dirección no pasa la regla de envío: el aviso nunca le llegaría. */
  utilizable: boolean;
  motivo: string | null;
  preseleccionado: boolean;
}

/** Lo que Terceros sabe de los correos de un proveedor. */
export interface CorreosDelProveedor {
  terceroId: string;
  nombre: string;
  correo: string | null;
  contactos: ReadonlyArray<{ id: string; nombre: string; correo: string | null; recibeAvisosDePago: boolean }>;
}

const MOTIVO_NO_UTILIZABLE = 'El correo no se puede usar para enviar: revise cómo está escrito.';

function posible(datos: Pick<DestinatarioPosible, 'origen' | 'origenId' | 'nombre'>, direccion: string) {
  const utilizable = DireccionDeEnvio.esUtilizable(direccion);
  return { ...datos, direccion, utilizable, motivo: utilizable ? null : MOTIVO_NO_UTILIZABLE, preseleccionado: false };
}

/**
 * A quién se le puede avisar: los contactos del proveedor con correo y, al final, su correo principal. Entran
 * preseleccionados los contactos con la marca «recibe avisos de pago» que tengan un correo utilizable; si no hay
 * ninguno, el correo principal (si es utilizable).
 */
export function destinatariosPosibles(proveedor: CorreosDelProveedor): DestinatarioPosible[] {
  const contactos = proveedor.contactos.flatMap((contacto) =>
    contacto.correo
      ? [{ ...posible({ origen: 'contacto', origenId: contacto.id, nombre: contacto.nombre }, contacto.correo) }]
      : [],
  );
  const marcados = new Set(proveedor.contactos.filter((c) => c.recibeAvisosDePago).map((c) => c.id));
  const principal = proveedor.correo
    ? [posible({ origen: 'tercero', origenId: proveedor.terceroId, nombre: proveedor.nombre }, proveedor.correo)]
    : [];
  const conMarca = contactos.map((c) => ({ ...c, preseleccionado: c.utilizable && marcados.has(c.origenId) }));
  const hayMarcados = conMarca.some((c) => c.preseleccionado);
  return [...conMarca, ...principal.map((p) => ({ ...p, preseleccionado: !hayMarcados && p.utilizable }))];
}

/** Los documentos pagados en una línea de texto: serie y número, separados por coma, hasta 20 y «y N más». */
export function documentosEnTexto(documentos: ReadonlyArray<{ serie: string | null; numero: string }>): string {
  const nombres = documentos.map(({ serie, numero }) => (serie ? `${serie}-${numero}` : numero));
  const visibles = nombres.slice(0, MAXIMO_DE_DOCUMENTOS_EN_EL_TEXTO).join(', ');
  const restantes = nombres.length - MAXIMO_DE_DOCUMENTOS_EN_EL_TEXTO;
  return restantes > 0 ? `${visibles} y ${restantes} más` : visibles;
}

/**
 * Comprueba que el asunto y el mensaje solo usen marcadores conocidos (al guardar la configuración, no al enviar).
 * @returns `null` si están bien; si no, el texto del problema.
 */
export function problemaEnLaPlantilla(texto: string, marcadores: readonly string[]): string | null {
  try {
    PlantillaDeCorreo.crear(texto, marcadores);
    return null;
  } catch (error) {
    if (error instanceof MarcadorDesconocido) return error.message;
    throw error;
  }
}
