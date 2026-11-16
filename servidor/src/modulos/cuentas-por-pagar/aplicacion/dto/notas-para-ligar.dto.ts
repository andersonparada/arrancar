/** Una nota de débito marcada para Cuentas por pagar con lo que ya se le aplicó. Dinero como texto con dos decimales. */
export interface NotaParaLigarDto {
  movimientoId: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  fecha: string;
  /** El correlativo de la nota en Bancos; nulo si no tiene. */
  numero: number | null;
  referencia: string | null;
  beneficiario: string | null;
  monto: string;
  /** Lo que suman los pagos vigentes que la ligan. */
  aplicado: string;
  /** Lo que le queda por aplicar. */
  disponible: string;
}
