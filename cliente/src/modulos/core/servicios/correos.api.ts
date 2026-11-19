import { clienteHttp, type ClienteHttp } from './cliente-http';
import type { EstadoDelCorreo } from './correo-de-soporte.api';

export type { EstadoDelCorreo };

export interface DestinatarioDelCorreo {
  direccion: string;
  nombre: string | null;
  clase: 'para' | 'copia';
  /** Lo que respondió el servidor de correo; `null` mientras no se haya enviado. */
  resultado: 'aceptado' | 'rechazado' | null;
}

/** Un correo para listas y fichas: sin el cuerpo y sin el detalle técnico (eso es de Soporte). */
export interface CorreoResumen {
  id: string;
  tipo: string;
  origen: { recurso: string; registroId: string };
  asunto: string;
  estado: EstadoDelCorreo;
  intentos: number;
  destinatarios: DestinatarioDelCorreo[];
  adjuntoNombre: string | null;
  creadoEn: string;
  proximoIntento: string | null;
  enviadoEn: string | null;
  canceladoEn: string | null;
  motivoDeCancelacion: string | null;
}

/** La ficha de un correo: el resumen y el texto enviado (nulo si ya se depuró). */
export interface CorreoFicha extends CorreoResumen {
  nombreVisible: string;
  responderA: string | null;
  cuerpoTexto: string | null;
  contenidoDepurado: boolean;
}

export interface PaginaDeCorreos {
  elementos: CorreoResumen[];
  total: number;
  pagina: number;
  limite: number;
}

export interface FiltroDeCorreos {
  desde?: string;
  hasta?: string;
  estado?: EstadoDelCorreo;
  tipo?: string;
  pagina: number;
  limite: number;
}

/** El historial de correos de la empresa activa. */
export class ApiCorreos {
  constructor(private readonly http: ClienteHttp) {}

  listar(filtro: FiltroDeCorreos) {
    return this.http.obtener<PaginaDeCorreos>('/correos', { ...filtro });
  }

  obtener(id: string) {
    return this.http.obtener<CorreoFicha>(`/correos/${id}`);
  }

  cancelar(id: string, motivo: string) {
    return this.http.crear<CorreoFicha>(`/correos/${id}/cancelar`, { motivo });
  }

  reintentar(id: string) {
    return this.http.crear<CorreoFicha>(`/correos/${id}/reintentar`, {});
  }
}

export const apiCorreos = new ApiCorreos(clienteHttp);
