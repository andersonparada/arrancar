import type { FormaDePago } from '../../dominio/pagos.js';
import type { AplicacionDelPagoDto, PagoDto } from './registro-de-pago.dto.js';

/** Una retención del documento, tal como la practicó el libro de compras; sin número de constancia, «por emitir». */
export interface RetencionDeLaLineaDto {
  impuesto: 'iva' | 'isr';
  monto: string;
  fecha: string;
  constanciaNumero: string | null;
  porEmitir: boolean;
}

/** Lo que el pago entrega a un cargo, con lo que la ficha muestra de él hoy. Dinero como texto con dos decimales. */
export interface AplicacionDeLaFichaDto extends AplicacionDelPagoDto {
  /** Lo que las notas de crédito rebajaron del documento. */
  notasAplicadas: string;
  /** Lo que le queda por pagar hoy (con todos sus pagos vigentes). */
  saldoDelDocumento: string;
  /** El residuo de centavos que se puede dar por saldado desde este pago; `0.00` si no hay o no se puede. */
  diferenciaOfrecible: string;
  retencionesDelLibro: RetencionDeLaLineaDto[];
}

/** El cheque o la nota de Bancos del pago. */
export interface MovimientoDeLaFichaDto {
  id: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  tipo: 'cheque' | 'nota_de_debito' | 'nota_de_credito';
  /** El número del cheque o el de la nota. */
  numero: number;
  fecha: string;
  conciliado: boolean;
  anulado: boolean;
}

/** El retiro del que sale el efectivo de un pago en efectivo. */
export interface RetiroDelPagoDto {
  id: string;
  /** Como se lee: `15` o `2026-15`. */
  numero: string;
  custodio: string;
  estado: string;
}

/** Una fila de la lista de pagos. */
export interface PagoResumenDto {
  id: string;
  numero: string;
  proveedor: { id: string; nombre: string; nit: string | null };
  contrasenas: Array<{ id: string; numero: string }>;
  forma: FormaDePago;
  fecha: string;
  posfechado: boolean;
  monto: string;
  estado: 'vigente' | 'anulado';
  /** Solo en un pago anulado. */
  fechaDeAnulacion: string | null;
  movimiento: { cuentaBancariaId: string; cuentaBancariaNombre: string; numero: number | null } | null;
  retiro: { id: string; numero: string; custodio: string } | null;
}

export interface PaginaDePagosDto {
  elementos: PagoResumenDto[];
  total: number;
}

/**
 * El pago completo para su ficha: lo del `PagoDto` más lo que Bancos dice del cheque o la nota, lo que cada línea deja del
 * documento y lo que se puede hacer con él (calculado en el servidor, que es quien valida).
 */
export interface FichaDePagoDto extends Omit<PagoDto, 'movimiento' | 'aplicaciones' | 'avisos'> {
  referencia: string | null;
  /** Solo en efectivo: quien recibió el dinero por el proveedor. */
  recibidoPor: string | null;
  motivoSinBancarizar: string | null;
  movimiento: MovimientoDeLaFichaDto | null;
  /** El cheque o la nota ya está conciliado: el banco lo pagó. */
  conciliado: boolean;
  retiro: RetiroDelPagoDto | null;
  /** Las líneas, juntas por contraseña. */
  aplicaciones: AplicacionDeLaFichaDto[];
  creadoPorNombre: string | null;
  creadoEn: string;
  puedeAnular: boolean;
  puedeReaplicar: boolean;
  puedeSaldarDiferencia: boolean;
}
