import type { ResultadoDeEnvio } from '../transporte-de-correo.js';

export interface DestinatarioPorEnviar {
  readonly clase: 'para' | 'copia';
  readonly direccion: string;
  readonly nombre: string | null;
}

/** Un correo que el trabajador tomó (ya está `enviando`, con arriendo). Lo da `core.tomar_correos_pendientes`. */
export interface CorreoPorEnviar {
  readonly id: string;
  readonly empresaId: string;
  readonly asunto: string;
  readonly texto: string;
  readonly html: string;
  readonly nombreVisible: string;
  readonly responderA: string | null;
  readonly messageId: string;
  readonly intentos: number;
  readonly destinatarios: readonly DestinatarioPorEnviar[];
  /** Ruta del PDF en el almacenamiento, si lleva adjunto. */
  readonly adjuntoRuta: string | null;
  readonly adjuntoNombre: string | null;
}

/** `sin_servidor`: no se pudo ni intentar (servidor apagado, sin llave o contraseña ilegible). No gasta intento. */
export type ResultadoDeIntento = ResultadoDeEnvio | 'sin_servidor';

export interface Resolucion {
  readonly id: string;
  readonly resultado: ResultadoDeIntento;
  readonly codigo: string | null;
  readonly rechazados: readonly string[];
  readonly duracionMs: number;
}

/**
 * La bandeja vista por el trabajador, que atiende a todas las empresas: va por funciones `security definer`, no por
 * RLS, y no necesita unidad de trabajo.
 */
export interface ColaDeEnvio {
  tomar(limite: number, minutosDeArriendo: number): Promise<CorreoPorEnviar[]>;
  /** @returns el estado en que quedó el correo. */
  resolver(resolucion: Resolucion): Promise<string>;
}

export interface ResultadoDeDepuracionDeCorreos {
  readonly contenido: number;
  readonly filas: number;
}

export interface DepuradorDeCorreos {
  depurar(diasDelContenido: number, mesesDeLosMetadatos: number): Promise<ResultadoDeDepuracionDeCorreos>;
}
