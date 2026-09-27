import type { UsuarioDto } from '../dto/usuario.dto.js';

export interface ConsultasUsuarios {
  /** Los que trabajan en alguna empresa de la cuenta (sin los de soporte), ordenados por nombre. */
  listarDeCuenta(cuentaId: string): Promise<UsuarioDto[]>;
}
