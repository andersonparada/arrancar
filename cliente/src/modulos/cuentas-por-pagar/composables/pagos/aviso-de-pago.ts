import { fechaDelEstado, nombreDelEstado } from '@/modulos/core/composables/correo/estado-del-correo';
import type { CorreoResumen } from '@/modulos/core/servicios/correos.api';
import type { AvisoDePago, DestinatarioPosible, SolicitudDeAviso } from '../../servicios/tipos-de-avisos-de-pago';

/** Lo que la ventana de enviar el aviso deja escoger. */
export interface EdicionDeAviso {
  abierta: boolean;
  /** Las llaves (`origen:id`) de los destinatarios marcados. */
  marcados: string[];
  conCopia: boolean;
}

/** Cuántos destinatarios admite un aviso. */
export const MAXIMO_DE_DESTINATARIOS = 10;

/** Lo que dice la ventana sobre el PDF: lleva datos que el proveedor verá. */
export const AVISO_DEL_PDF =
  'El PDF del comprobante lleva montos, NIT y retenciones del pago, y el proveedor lo recibe tal cual.';

export const llaveDe = (posible: Pick<DestinatarioPosible, 'origen' | 'origenId'>): string =>
  `${posible.origen}:${posible.origenId}`;

export const edicionCerrada = (): EdicionDeAviso => ({ abierta: false, marcados: [], conCopia: false });

/** La ventana abierta con lo preseleccionado por el servidor y la copia que dice la configuración de la empresa. */
export function edicionAbierta(aviso: AvisoDePago): EdicionDeAviso {
  return {
    abierta: true,
    marcados: aviso.posibles.filter((p) => p.preseleccionado && p.utilizable).map(llaveDe),
    conCopia: aviso.copiaPorOmision && aviso.copiaALaEmpresa !== null,
  };
}

/** Marca o desmarca un destinatario. */
export function alternarDestinatario(edicion: EdicionDeAviso, posible: DestinatarioPosible): EdicionDeAviso {
  const llave = llaveDe(posible);
  const marcados = edicion.marcados.includes(llave)
    ? edicion.marcados.filter((marcado) => marcado !== llave)
    : [...edicion.marcados, llave];
  return { ...edicion, marcados };
}

/** Se puede enviar con al menos un destinatario y sin pasar del máximo. */
export const sePuedeEnviarLaEdicion = (edicion: EdicionDeAviso): boolean =>
  edicion.marcados.length >= 1 && edicion.marcados.length <= MAXIMO_DE_DESTINATARIOS;

/** Lo que se manda: los ids de los marcados, en el orden en que el servidor los ofrece. */
export function solicitudDeAviso(edicion: EdicionDeAviso, aviso: AvisoDePago): SolicitudDeAviso {
  return {
    destinatarios: aviso.posibles
      .filter((posible) => edicion.marcados.includes(llaveDe(posible)))
      .map(({ origen, origenId }) => ({ origen, origenId })),
    copiaALaEmpresa: edicion.conCopia && aviso.copiaALaEmpresa !== null,
  };
}

/** «Enviar aviso» la primera vez y «Reenviar aviso» si ya hay alguno (cada envío es un correo nuevo). */
export const textoDelBotonDeAviso = (enviados: readonly CorreoResumen[]): string =>
  enviados.some((correo) => correo.estado !== 'cancelado') ? 'Reenviar aviso' : 'Enviar aviso';

/** El estado del último aviso, como lo lee quien mira el pago: «Sin aviso», «Pendiente», «Enviado el … a …»… */
export function estadoDelUltimoAviso(enviados: readonly CorreoResumen[]): string {
  const [ultimo] = enviados;
  if (!ultimo) return 'Sin aviso';
  if (ultimo.estado === 'fallido') return 'Falló; avise a soporte';
  if (ultimo.estado === 'enviado')
    return `${fechaDelEstado(ultimo)} a ${ultimo.destinatarios[0]?.direccion ?? 'el proveedor'}`;
  if (ultimo.estado === 'pendiente' && ultimo.intentos > 0) return 'No se pudo enviar; se reintentará';
  return nombreDelEstado(ultimo);
}

/** Un pago anulado cuyo aviso ya salió: el correo no se puede detener, hay que avisar a mano. */
export const RECORDATORIO_DE_ANULACION = 'El aviso ya se envió; avise al proveedor de la anulación.';

export function hayQueAvisarLaAnulacion(anulado: boolean, enviados: readonly CorreoResumen[]): boolean {
  return anulado && enviados.some((correo) => correo.estado === 'enviado');
}
