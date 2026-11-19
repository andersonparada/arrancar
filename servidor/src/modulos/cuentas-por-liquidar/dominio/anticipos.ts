export type FormaDeAnticipo = 'cheque' | 'nota_de_debito';

export type EstadoDeAnticipo = 'abierto' | 'liquidado' | 'anulado';

export type ClaseDeAnticipo = 'viatico' | 'compra' | 'otro';

export type DestinoDeLoNoLiquidado = 'cobrar' | 'renta_del_trabajo' | 'perdida';

/** Clave del correlativo de los anticipos en `core.correlativos`. */
export const CLAVE_DE_ANTICIPOS = 'cuentas-por-liquidar.anticipos';

/** El recurso con que se auditan los anticipos. */
export const RECURSO_DE_ANTICIPOS = 'cuentas-por-liquidar.anticipos';

/** El módulo que Bancos guarda como origen del cheque o la nota del anticipo. */
export const MODULO_DE_ORIGEN = 'cuentas-por-liquidar';

/** El número del anticipo como se lee: `15` o `2026-15` (con año si el correlativo se reinicia). */
export const numeroDelAnticipo = (numero: number, anio: number): string =>
  anio > 0 ? `${anio}-${numero}` : String(numero);

/**
 * Dinero que la empresa entregó a una persona (un tercero de la cuenta, empleado o no) que debe justificarlo con
 * documentos. Las cifras van en centavos enteros. `movimientoId` es el cheque o la nota de Bancos de la entrega.
 */
export interface Anticipo {
  id: string;
  numero: number;
  anioDeNumero: number;
  beneficiarioId: string;
  beneficiario: string;
  esEmpleado: boolean;
  beneficiarioUsuarioId: string | null;
  clase: ClaseDeAnticipo;
  descripcion: string;
  localidadId: string | null;
  /** `AAAA-MM-DD`: la del cheque o la nota. */
  fecha: string;
  fechaLimite: string;
  montoCentavos: number;
  forma: FormaDeAnticipo;
  movimientoId: string;
  motivoConVencidos: string | null;
  estado: EstadoDeAnticipo;
  fechaDeLiquidacion: string | null;
  devueltoCentavos: number;
  movimientoDeDevolucionId: string | null;
  reembolsadoCentavos: number;
  movimientoDeReembolsoId: string | null;
  noLiquidadoCentavos: number;
  destinoDeNoLiquidado: DestinoDeLoNoLiquidado | null;
  cuotas: number | null;
  motivoDeNoLiquidado: string | null;
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}

/** El anticipo está vencido si sigue abierto después de su fecha límite. */
export const estaVencido = (anticipo: Pick<Anticipo, 'estado' | 'fechaLimite'>, hoy: string): boolean =>
  anticipo.estado === 'abierto' && anticipo.fechaLimite < hoy;

/** Lo que falta por justificar: el monto menos lo gastado (negativo si se gastó de más). */
export const porJustificar = (anticipo: Pick<Anticipo, 'montoCentavos'>, gastadoCentavos: number): number =>
  anticipo.montoCentavos - gastadoCentavos;
