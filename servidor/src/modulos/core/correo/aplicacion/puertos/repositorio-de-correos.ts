import type { Destinatario } from '../../dominio/destinatarios-de-correo.js';
import type { UsoDeCupos } from '../../dominio/cupos-de-correo.js';
import type { OrigenDeCorreo } from '../bandeja-de-salida.js';

/** Un correo listo para guardarse en la bandeja. */
export interface CorreoNuevo {
  readonly tipo: string;
  readonly origen: OrigenDeCorreo;
  readonly asunto: string;
  readonly texto: string;
  readonly html: string;
  readonly nombreVisible: string;
  readonly responderA: string | null;
  readonly messageId: string;
  readonly destinatarios: readonly Destinatario[];
  readonly adjunto: { archivoId: string; nombre: string; sha256: string } | null;
}

/** La bandeja dentro de la unidad de trabajo en curso (RLS por empresa). */
export interface RepositorioDeCorreos {
  /** Toma el candado de la cuenta (hasta el final de la transacción) y cuenta lo ya encolado. */
  reservarCupo(direcciones: readonly string[]): Promise<UsoDeCupos>;
  /** Deja una marca por destinatario del reintento a mano de un correo: gasta cupo como un envío más. */
  marcarReintento(correoId: string, direcciones: readonly string[]): Promise<void>;
  /** Guarda el correo y sus destinatarios; devuelve el id. */
  insertar(correo: CorreoNuevo): Promise<string>;
}
