import type { CorreoResumenDto } from '../../../core/correo/aplicacion/dto/correo.dto.js';
import type { DestinatarioPosible } from '../../dominio/aviso-de-pago.js';
import type { EnvioDelAviso } from '../puertos/puertos-de-avisos-de-pago.js';

/**
 * Lo que la ventana «Enviar aviso» del pago necesita: a quién se le puede avisar (con su marca), la copia a la empresa,
 * cómo quedaría el mensaje y qué avisos ya salieron. Las direcciones son siempre las registradas: nunca se escriben.
 */
export interface AvisoDePagoDto {
  envio: EnvioDelAviso;
  posibles: DestinatarioPosible[];
  /** El correo de la empresa si sirve para enviar (copia visible y «Responder a»); `null` si no tiene o no sirve. */
  copiaALaEmpresa: string | null;
  /** Si la casilla de copia sale marcada: lo que dice la configuración de la empresa. */
  copiaPorOmision: boolean;
  vistaPrevia: { asunto: string; mensaje: string; adjuntoNombre: string | null };
  /** Los avisos de este pago, del más nuevo al más viejo (sin cuerpo ni detalle técnico). */
  enviados: CorreoResumenDto[];
  sePuedeEnviar: boolean;
  /** Por qué no se puede enviar; `null` si se puede. */
  motivoSinAviso: string | null;
}

/** Lo que el usuario escoge al enviar: ids de destinatarios registrados (nunca direcciones) y la copia. */
export interface SolicitudDeAviso {
  destinatarios: ReadonlyArray<{ origen: 'tercero' | 'contacto'; origenId: string }>;
  copiaALaEmpresa: boolean;
}
