import type { FormaDePago } from '../../dominio/pagos.js';

/** Lo que filtra R9: la empresa, los días de los meses pedidos (inclusive) y, si se quiere, un proveedor. */
export interface FiltroDeBancarizacion {
  empresaId: string;
  /** `AAAA-MM-DD`: el primer día del primer mes. */
  desde: string;
  /** `AAAA-MM-DD`: el último día del último mes. */
  hasta: string;
  proveedorId?: string;
}

/** Un cargo pagado en efectivo, con lo del libro que hace falta para marcar el efecto fiscal. En centavos. */
export interface CargoDeBancarizacion {
  documentoId: string;
  /** Serie y número, como se leen. */
  etiqueta: string;
  proveedorId: string;
  /** El total antes de retenciones (en un saldo inicial, su `saldo_al_inicio`). */
  totalCentavos: number;
  /** El IVA del documento del libro; `null` en un saldo inicial. */
  ivaCentavos: number | null;
  /** `iva − iva_no_acreditable`; `null` en un saldo inicial. */
  ivaAcreditableCentavos: number | null;
  esSaldoInicial: boolean;
}

/** Un pago en efectivo vigente de los meses pedidos, con los cargos que cubre. */
export interface PagoEnEfectivoDelRango {
  pagoId: string;
  /** El número del pago, que es el del recibo. */
  recibo: string;
  fecha: string;
  proveedorId: string;
  proveedorNombre: string;
  /** El número del retiro de donde salió el efectivo. */
  retiro: string | null;
  montoCentavos: number;
  /** El motivo de la excepción con permiso; `null` si el pago no la usó. */
  motivoSinBancarizar: string | null;
  cargos: CargoDeBancarizacion[];
}

/** Lo que un pago vigente entregó a un documento. */
export interface PagoDeUnDocumento {
  pagoId: string;
  numero: string;
  forma: FormaDePago;
  fecha: string;
  montoCentavos: number;
}

/** Un cargo del umbral o más con al menos un pago en efectivo en los meses pedidos, con todos sus pagos vigentes. */
export interface DocumentoSobreElUmbral {
  cargo: CargoDeBancarizacion;
  proveedorNombre: string;
  pagos: PagoDeUnDocumento[];
}

/** Las lecturas de R9. Las sumas del mes salen de `ConsultasDePagos.pagosDelMes`, la misma fórmula de CP4. */
export interface ConsultasDeBancarizacion {
  pagosEnEfectivo(filtro: FiltroDeBancarizacion): Promise<PagoEnEfectivoDelRango[]>;
  documentosSobreElUmbral(
    filtro: FiltroDeBancarizacion & { umbralCentavos: number },
  ): Promise<DocumentoSobreElUmbral[]>;
}
