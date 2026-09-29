/**
 * `devolver`: regresa un documento elaborado a en proceso (por ahora, solo conciliaciones).
 * `blanquear`: un cheque emitido por error vuelve a disponible y su movimiento se elimina (Bancos).
 * `corregir`: se cambió dinero o fechas de un registro; `anterior` guarda cómo estaba (Bancos: notas y saldo inicial).
 */
export type AccionAuditada = 'eliminar' | 'inactivar' | 'reactivar' | 'anular' | 'devolver' | 'blanquear' | 'corregir';

/** Una baja (o su reversa): qué registro, qué se hizo, por qué y cómo estaba antes. */
export interface EntradaDeAuditoria {
  /** `<modulo>.<recurso>`, como los permisos: `terceros.contactos`. */
  recurso: string;
  registroId: string;
  accion: AccionAuditada;
  /** El registro antes del cambio, tal como lo ve la pantalla. */
  anterior: unknown;
  motivo?: string | null;
}

/**
 * Bitácora de auditoría: cada borrado, inactivación, reactivación, anulación o
 * corrección de dinero o fechas de la app. Se llama dentro de la unidad de trabajo del cambio, así que se guardan
 * los dos o ninguno; quién, en qué empresa y cuándo los pone la transacción.
 */
export interface Auditoria {
  registrar(entrada: EntradaDeAuditoria): Promise<void>;
}

/** Un cambio del estado activo, para auditar si de verdad cambió. */
export interface CambioDeEstado extends Omit<EntradaDeAuditoria, 'accion'> {
  activoAntes: boolean;
  activoDespues: boolean;
}

/** Registra la inactivación o la reactivación; si el estado no cambió, no hay nada que auditar. */
export async function auditarCambioDeEstado(
  auditoria: Auditoria,
  { activoAntes, activoDespues, ...entrada }: CambioDeEstado,
): Promise<void> {
  if (activoAntes === activoDespues) return;
  await auditoria.registrar({ ...entrada, accion: activoDespues ? 'reactivar' : 'inactivar' });
}
