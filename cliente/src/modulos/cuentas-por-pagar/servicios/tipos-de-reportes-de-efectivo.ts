import type { FormaDelPago } from './tipos-de-reportes-de-pagos';

/** Un cargo pagado en efectivo con su efecto fiscal (R9). */
export interface CargoDeBancarizacion {
  documentoId: string;
  documento: string;
  /** «Crédito fiscal en riesgo por bancarización» y/o «Costo no deducible». */
  marcas: string[];
  ivaEnRiesgo: string;
  costoNoDeducible: string;
  /** Saldo inicial con efecto: no se sabe cuánto IVA tenía. */
  ivaNoConocido: boolean;
}

export interface PagoEnEfectivo {
  pagoId: string;
  recibo: string;
  fecha: string;
  retiro: string | null;
  monto: string;
  sinBancarizar: boolean;
  motivoSinBancarizar: string | null;
  cargos: CargoDeBancarizacion[];
}

export interface MesDeBancarizacion {
  proveedorId: string;
  proveedorNombre: string;
  /** `AAAA-MM`. */
  mes: string;
  sumaDelMes: string;
  efectivo: string;
  ivaEnRiesgo: string;
  costoNoDeducible: string;
  pagos: PagoEnEfectivo[];
}

export interface PagoDeUnDocumento {
  pagoId: string;
  numero: string;
  forma: FormaDelPago;
  fecha: string;
  monto: string;
}

export interface DocumentoSobreElUmbral extends CargoDeBancarizacion {
  proveedorId: string;
  proveedorNombre: string;
  total: string;
  efectivo: string;
  pagos: PagoDeUnDocumento[];
}

export interface CifrasDeBancarizacion {
  cantidad: number;
  efectivo: string;
  ivaEnRiesgo: string;
  costoNoDeducible: string;
}

export interface ReporteDeBancarizacion {
  /** Meses `AAAA-MM`. */
  desde: string;
  hasta: string;
  umbral: string;
  meses: MesDeBancarizacion[];
  documentosSobreElUmbral: DocumentoSobreElUmbral[];
  totales: {
    meses: CifrasDeBancarizacion;
    documentos: CifrasDeBancarizacion;
    total: { ivaEnRiesgo: string; costoNoDeducible: string };
  };
  leyendas: string[];
}

export interface FilaDeRetiroPorLiquidar {
  id: string;
  numero: string;
  forma: 'cheque' | 'nota_de_debito';
  documento: number;
  cuentaBancariaId: string;
  fecha: string;
  custodio: string;
  monto: string;
  pagado: string;
  disponible: string;
  diasAbierto: number;
  deMesAnterior: boolean;
}

export interface ReporteDeRetirosPorLiquidar {
  corte: string;
  filas: FilaDeRetiroPorLiquidar[];
  total: { cantidad: number; monto: string; pagado: string; disponible: string };
  leyendas: string[];
}

export interface FilaDeNotaSinAplicar {
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

export interface ReporteDeNotasSinAplicar {
  corte: string;
  filas: FilaDeNotaSinAplicar[];
  total: { cantidad: number; monto: string; aplicado: string; disponible: string };
  leyendas: string[];
}
