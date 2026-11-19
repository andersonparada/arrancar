/**
 * `devolver`: regresa un documento elaborado a en proceso (por ahora, solo conciliaciones).
 * `blanquear`: un cheque emitido por error vuelve a disponible y su movimiento se elimina (Bancos).
 * `corregir`: se cambió dinero o fechas de un registro; `anterior` guarda cómo estaba (Bancos: notas y saldo inicial).
 * `reabrir`: se reabrió algo que estaba cerrado, con su motivo (Empresas: la carga inicial).
 * `cerrar`: se cerró algo con su revisión como constancia (Empresas: la carga inicial; `anterior` lleva lo revisado).
 * `descartar`: se apartó una fila de una bandeja de trabajo sin registrarla, con su motivo (Libro de compras: DTE recibidos).
 * `autorizar`: se autorizó algo que la misma persona ingresó o completó, excepción a la separación de funciones (Cuentas por pagar).
 * `adjuntar`: se adjuntó un documento de respaldo; `anterior` lleva el documento como quedó (Empresas: balance de apertura).
 * `ajustar`: se dio de baja o se trasladó un saldo a favor, con su causa (Cuentas por pagar: ajustes de notas de crédito).
 * `reimprimir`: se volvió a imprimir un cheque o su comprobante, con su motivo; `anterior` lleva el cheque y sus impresiones (Bancos).
 * `inutilizar`: el pago de un cheque pasó a otro formulario porque el papel quedó inservible; `anterior` lleva el cheque como estaba (Bancos).
 * `cambiar_vencimiento`: se movió el vencimiento de un cargo, con el antes y el después (Cuentas por pagar).
 * `configurar`: se cambió una configuración de la empresa; `anterior` lleva los valores de antes y de después (Cuentas por pagar: avisos de pago).
 */
export type AccionAuditada =
  | 'eliminar'
  | 'inactivar'
  | 'reactivar'
  | 'anular'
  | 'devolver'
  | 'blanquear'
  | 'corregir'
  | 'reabrir'
  | 'cerrar'
  | 'descartar'
  | 'autorizar'
  | 'asignar'
  | 'quitar'
  | 'adjuntar'
  | 'ajustar'
  | 'cambiar_vencimiento'
  | 'reimprimir'
  | 'inutilizar'
  | 'configurar';

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
