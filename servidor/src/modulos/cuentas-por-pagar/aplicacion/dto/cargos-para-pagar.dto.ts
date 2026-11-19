import type { OrigenDeDocumento, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';
import type { ContrasenaDelPagoDto } from './registro-de-pago.dto.js';

/** Un cargo que la ventana de pago ofrece, con lo que hace falta para decidir cuánto pagarle. Dinero como texto. */
export interface CargoParaPagarDto {
  id: string;
  /** La contraseña vigente del cargo: la línea del pago la lleva el servidor, no el cliente. */
  contrasenaId: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  origen: OrigenDeDocumento;
  fechaDeEmision: string;
  /** Nula en un saldo inicial, que no pasó por el libro. */
  fechaDeRecepcion: string | null;
  vencimiento: string | null;
  total: string;
  /** La deuda: lo que falta por pagar, también lo comprometido con cheques posfechados. */
  saldo: string;
  /** La parte de la deuda cubierta con pagos de fecha posterior a hoy. */
  comprometido: string;
  /** Lo que aún se puede pagar (`saldo` menos `comprometido`): el tope del monto de la línea. */
  disponible: string;
  /** La fecha del cheque posfechado más lejano; `null` si no hay. */
  comprometidoHasta: string | null;
  /** Lo que se propone pagar: todo lo disponible; el usuario lo cambia. */
  propuesto: string;
  /** Las retenciones que este cargo descontaría en su primer pago (cero si ya se descontaron o es saldo inicial). */
  retencionPorDescontar: string;
  /** Solo un saldo inicial: retenciones que la empresa aún no practicó; el pago no las descuenta. */
  retencionesPorPracticar: string;
  /** Cuántas retenciones del libro no tienen constancia registrada. */
  constanciasPendientes: number;
  /** `AAAA-MM` de la retención más antigua del libro; el mes con el que se enteran. */
  mesDeRetencion: string | null;
  tieneActivoFijo: boolean;
  sobreUmbralDeBancarizacion: boolean;
}

export interface CargosParaPagarDto {
  /** Las contraseñas vigentes del proveedor con algo por pagar: la abierta primero. */
  contrasenas: Array<ContrasenaDelPagoDto & { fecha: string }>;
  /** Los cargos autorizados con saldo, por contraseña y vencimiento. */
  cargos: CargoParaPagarDto[];
  /** Los cargos con saldo en una contraseña que todavía no se autorizaron: no se pueden pagar. */
  noAutorizados: CargoParaPagarDto[];
  /** La fecha que el pago no puede preceder: la emisión de lo propuesto y, con un saldo inicial, la fecha de inicio. */
  fechaMinima: string | null;
  fechaDeInicio: string | null;
  cargaCerrada: boolean;
  /** El nombre del NIT, que irá en el cheque o la nota; `null` si hay que escribirlo en Terceros. */
  beneficiario: string | null;
  /** Lo pagado al proveedor en el mes de la fecha con cheques, notas de débito, notas ligadas y efectivo. */
  sumaDelMesAlProveedor: string;
  umbralDeBancarizacion: string;
  topeDiferencia: string;
  /** Posfechados de apertura sin ligar que podrían ser de este proveedor (AP-0); `cantidad` 0 si no hay. */
  chequesDeAperturaSinLigar: { cantidad: number; total: string };
}

export interface ProveedorPorPagarDto {
  proveedorId: string;
  nombre: string;
  nit: string | null;
  /** La deuda con el proveedor en los cargos que puede pagar (también lo comprometido). */
  porPagar: string;
  /** Lo que aún se puede pagar: `porPagar` menos lo comprometido. */
  disponible: string;
  contrasenas: number;
}
