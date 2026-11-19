import type { Operador } from '../../compartido/aplicacion/operador.js';
import type { PlantillaPorEncolar } from '../dominio/contenido-de-correo.js';
import type { ClaseDeDestinatario, DestinatarioPorEncolar } from '../dominio/destinatarios-de-correo.js';
import type { CorreoResumenDto } from './dto/correo.dto.js';
import type { AdjuntoDeCorreo } from './transporte-de-correo.js';

export interface OrigenDeCorreo {
  /** Recurso del módulo que lo pide, p. ej. `cuentas-por-pagar.pagos`. */
  readonly recurso: string;
  readonly registroId: string;
}

/**
 * Lo que un módulo pide enviar. Nunca lleva direcciones escritas por el usuario: los destinatarios ya vienen
 * resueltos de datos registrados (terceros, contactos, la empresa). Core valida cada dirección, arma el asunto y los
 * cuerpos con la plantilla (el módulo da los valores) y calcula los topes.
 */
export interface MensajePorEncolar {
  /** `<módulo>.<nombre>`, p. ej. `cuentas-por-pagar.aviso_de_pago`. */
  readonly tipo: string;
  readonly origen: OrigenDeCorreo;
  /** Nombre de la empresa, para el remitente visible y el pie. */
  readonly empresa: string;
  /** Correo de la empresa para «Responder a»; si no sirve para enviar, se omite. */
  readonly responderA: string | null;
  readonly destinatarios: readonly DestinatarioPorEncolar[];
  readonly plantilla: PlantillaPorEncolar;
  /** Un PDF generado por la aplicación (nunca un archivo subido por un usuario). */
  readonly adjunto: AdjuntoDeCorreo | null;
}

export interface CorreoEncoladoDto {
  id: string;
  estado: 'pendiente';
  asunto: string;
  destinatarios: ReadonlyArray<{ direccion: string; clase: ClaseDeDestinatario }>;
}

/**
 * Puerto público de core para mandar correo (como `DocumentosProtegidos`): cualquier módulo lo usa dentro de su unidad
 * de trabajo, así el correo existe si y solo si la operación se confirma (C3).
 */
export interface BandejaDeSalida {
  /**
   * Valida, cuenta los cupos con bloqueo por cuenta (C5), guarda el adjunto en `core.archivos`, inserta el correo y,
   * al confirmarse la transacción, despierta al trabajador.
   * @throws DireccionNoUtilizable, SinDestinatarios, DemasiadosDestinatarios, MarcadorDesconocido,
   * ContenidoDeCorreoNoValido, AdjuntoNoValido (400), CupoDeCorreosAgotado (429).
   */
  encolar(operador: Operador, mensaje: MensajePorEncolar): Promise<CorreoEncoladoDto>;

  /**
   * Cancela los correos **pendientes** de un registro (p. ej. un pago anulado), cada uno con su auditoría `anular`.
   * Lo ya enviado o en camino no se toca. Devuelve cuántos canceló.
   */
  cancelarPendientesDe(operador: Operador, origen: OrigenDeCorreo, motivo: string): Promise<number>;

  /** Cancela un correo pendiente de ese registro, con su motivo y su auditoría. */
  cancelar(
    operador: Operador,
    origen: OrigenDeCorreo,
    cancelacion: { correoId: string; motivo: string },
  ): Promise<CorreoResumenDto>;

  /** Los correos de un registro, del más nuevo al más viejo, para su ficha (sin cuerpo ni detalle técnico). */
  deRegistro(operador: Operador, origen: OrigenDeCorreo): Promise<CorreoResumenDto[]>;
}
