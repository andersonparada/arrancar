import type { ClaseDeDestinatario } from '../../dominio/destinatarios-de-correo.js';
import type { EstadoDeCorreo } from '../../dominio/estado-de-correo.js';

export interface DestinatarioDelCorreoDto {
  direccion: string;
  nombre: string | null;
  clase: ClaseDeDestinatario;
  /** Lo que respondió el servidor de correo; `null` mientras no se haya enviado. */
  resultado: 'aceptado' | 'rechazado' | null;
}

/**
 * Un correo para las listas y las fichas de los módulos. Sin cuerpo y sin el código técnico del error (eso es de
 * Soporte): la empresa ve a quién, qué, cuándo y cómo va.
 */
export interface CorreoResumenDto {
  id: string;
  tipo: string;
  origen: { recurso: string; registroId: string };
  asunto: string;
  estado: EstadoDeCorreo;
  intentos: number;
  destinatarios: DestinatarioDelCorreoDto[];
  /** Si lleva un PDF adjunto, su nombre. */
  adjuntoNombre: string | null;
  creadoEn: Date;
  /** Cuándo se intentará de nuevo (solo pendientes). */
  proximoIntento: Date | null;
  enviadoEn: Date | null;
  canceladoEn: Date | null;
  motivoDeCancelacion: string | null;
}

/** La ficha de un correo: el resumen y el texto enviado (nulo si ya se depuró). */
export interface CorreoDto extends CorreoResumenDto {
  nombreVisible: string;
  responderA: string | null;
  cuerpoTexto: string | null;
  contenidoDepurado: boolean;
}

export interface PaginaDeCorreosDto {
  elementos: CorreoResumenDto[];
  total: number;
  pagina: number;
  limite: number;
}
