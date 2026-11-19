import type { Operador } from '../../../core/compartido/aplicacion/operador.js';

/** La fecha de inicio de la empresa y si su carga inicial ya se cerró (`null` si todavía no tiene fecha). */
export interface EstadoDeLaCarga {
  fechaDeInicio: string | null;
  cerrada: boolean;
}

/**
 * La carga inicial de la empresa activa, que vive en Empresas. Corre dentro de la transacción de quien pregunta y toma
 * un bloqueo compartido: nadie cierra la carga ni cambia la fecha hasta que ella termine.
 */
export interface CargaInicial {
  obtener(operador: Operador): Promise<EstadoDeLaCarga>;
}
