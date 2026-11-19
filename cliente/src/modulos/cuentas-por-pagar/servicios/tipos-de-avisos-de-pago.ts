import type { CorreoResumen } from '@/modulos/core/servicios/correos.api';

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
  /** Los contactos con la marca «recibe avisos de pago» o, si no hay, el correo principal. */
  preseleccionado: boolean;
}

/** Lo que la ventana «Enviar aviso» del pago necesita. */
export interface AvisoDePago {
  envio: 'manual' | 'automatico';
  posibles: DestinatarioPosible[];
  /** El correo de la empresa si sirve para enviar (copia visible y «Responder a»); `null` si no. */
  copiaALaEmpresa: string | null;
  /** Si la casilla de copia sale marcada: lo que dice la configuración de la empresa. */
  copiaPorOmision: boolean;
  vistaPrevia: { asunto: string; mensaje: string; adjuntoNombre: string | null };
  /** Los avisos de este pago, del más nuevo al más viejo. */
  enviados: CorreoResumen[];
  sePuedeEnviar: boolean;
  /** Por qué no se puede enviar; `null` si se puede. */
  motivoSinAviso: string | null;
}

/** Los ajustes de los avisos de pago de la empresa (pantalla «Avisos de pago»). */
export interface AjustesDelAviso {
  envio: 'manual' | 'automatico';
  asunto: string;
  mensaje: string;
  adjuntarComprobante: boolean;
  copiaALaEmpresa: boolean;
}

/** Los ajustes con los marcadores permitidos y los textos originales, para ayudar a escribirlos. */
export interface AjustesDelAvisoConAyuda extends AjustesDelAviso {
  marcadoresDelAsunto: string[];
  marcadoresDelMensaje: string[];
  asuntoPorOmision: string;
  mensajePorOmision: string;
}

/** Lo que se manda: ids de destinatarios registrados (nunca direcciones) y la copia. */
export interface SolicitudDeAviso {
  destinatarios: Array<{ origen: OrigenDelDestinatario; origenId: string }>;
  copiaALaEmpresa: boolean;
}
