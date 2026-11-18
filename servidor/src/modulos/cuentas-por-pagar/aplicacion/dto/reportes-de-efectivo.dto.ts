import type { FormaDeRetiro } from '../../dominio/retiros.js';

/** Un retiro de efectivo abierto al corte (R10). */
export interface FilaDeRetiroPorLiquidarDto {
  id: string;
  numero: string;
  forma: FormaDeRetiro;
  /** El número del cheque o de la nota de Bancos. */
  documento: number;
  cuentaBancariaId: string;
  fecha: string;
  custodio: string;
  monto: string;
  /** Lo pagado en efectivo hasta el corte. */
  pagado: string;
  /** Lo que el custodio tenía sin usar al corte. */
  disponible: string;
  diasAbierto: number;
  /** El retiro es de un mes anterior al del corte: el aviso de fin de mes. */
  deMesAnterior: boolean;
}

/** R10: el efectivo en manos de custodios al corte. */
export interface ReporteDeRetirosPorLiquidarDto {
  corte: string;
  filas: FilaDeRetiroPorLiquidarDto[];
  total: { cantidad: number; monto: string; pagado: string; disponible: string };
  leyendas: string[];
}

/** Una nota de débito marcada para Cuentas por pagar con algo por aplicar al corte (R11). */
export interface FilaDeNotaSinAplicarDto {
  movimientoId: string;
  cuentaBancariaId: string;
  cuenta: string;
  fecha: string;
  numero: number | null;
  referencia: string | null;
  monto: string;
  aplicado: string;
  disponible: string;
  diasSinAplicar: number;
  conciliada: boolean;
}

/** R11: el saldo de la transitoria «Pagos a proveedores por aplicar» al corte. */
export interface ReporteDeNotasSinAplicarDto {
  corte: string;
  filas: FilaDeNotaSinAplicarDto[];
  total: { cantidad: number; monto: string; aplicado: string; disponible: string };
  leyendas: string[];
}
