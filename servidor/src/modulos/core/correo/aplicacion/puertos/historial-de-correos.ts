import type { EstadoDeCorreo } from '../../dominio/estado-de-correo.js';
import type { OrigenDeCorreo } from '../bandeja-de-salida.js';
import type { CorreoDto, CorreoResumenDto, PaginaDeCorreosDto } from '../dto/correo.dto.js';

export interface FiltroDeCorreos {
  /** Fechas `AAAA-MM-DD` de creación, ambas incluidas. */
  desde?: string | undefined;
  hasta?: string | undefined;
  estado?: EstadoDeCorreo | undefined;
  tipo?: string | undefined;
  pagina: number;
  limite: number;
}

/** Lo que pasa al cancelar: quién y por qué. */
export interface Cancelacion {
  usuarioId: string;
  motivo: string;
}

/**
 * El historial de correos de la empresa activa (RLS por empresa), dentro de la unidad de trabajo en curso.
 * Cancelar y reintentar son `update` condicionados al estado: si el trabajador tomó el correo en el ínterin,
 * no cambian nada y devuelven falso, sin pisarlo.
 */
export interface HistorialDeCorreos {
  listar(filtro: FiltroDeCorreos): Promise<PaginaDeCorreosDto>;
  buscar(id: string): Promise<CorreoDto | null>;
  deOrigen(origen: OrigenDeCorreo): Promise<CorreoResumenDto[]>;
  /** Pasa a `cancelado` si sigue `pendiente`. */
  cancelar(id: string, cancelacion: Cancelacion): Promise<boolean>;
  /** Cancela todos los pendientes de un registro y devuelve cómo estaban (para la auditoría). */
  cancelarPendientesDe(origen: OrigenDeCorreo, cancelacion: Cancelacion): Promise<CorreoResumenDto[]>;
  /** Pasa de `fallido` a `pendiente` con los intentos en cero. */
  reintentar(id: string): Promise<boolean>;
}
