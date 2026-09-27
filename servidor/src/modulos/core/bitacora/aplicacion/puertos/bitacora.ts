import type { EntradaDeBitacoraDto } from '../dto/entrada-de-bitacora.dto.js';

export interface NuevaEntrada {
  usuarioId: string;
  empresaId: string | null;
  accion: string;
  detalle?: Record<string, unknown>;
  direccionIp: string | null;
}

/** Registro de lo que hace soporte (superacceso) en cuentas ajenas; nunca se modifica. */
export interface Bitacora {
  registrar(entrada: NuevaEntrada): Promise<void>;
  /** Las más nuevas primero. */
  recientes(limite: number): Promise<EntradaDeBitacoraDto[]>;
}
