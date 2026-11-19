import type { EstadoDeCorreo } from '../../dominio/estado-de-correo.js';

/** Un correo fallido tal como lo ve Soporte: de qué empresa, qué tipo y con qué código; nunca a quién ni qué decía. */
export interface CorreoFallidoDto {
  id: string;
  empresa: string;
  tipo: string;
  codigo: string | null;
  intentos: number;
  creadoEn: Date;
  /** Si ya se depuró su contenido, el reintento no es posible. */
  contenidoDepurado: boolean;
}

/** El estado global de la bandeja de la instalación. */
export interface BandejaDeSoporteDto {
  /** Cuántos correos hay en cada estado, todas las empresas juntas (los cinco estados, aunque sean cero). */
  conteos: Record<EstadoDeCorreo, number>;
  /** Desde cuándo espera el pendiente más antiguo; `null` si no hay pendientes. */
  pendienteMasAntiguoDesde: Date | null;
  /** Los últimos fallidos, el más reciente primero. */
  fallidosRecientes: CorreoFallidoDto[];
}
