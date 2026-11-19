import type { FormaDePago } from '../../dominio/pagos.js';

/** Un cargo pagado en efectivo con su efecto fiscal (CP4-E3): lo que la empresa pierde si el pago no está bancarizado. */
export interface CargoDeBancarizacionDto {
  documentoId: string;
  documento: string;
  /** «Crédito fiscal en riesgo por bancarización» y/o «Costo no deducible»; vacío si el cargo no tiene efecto. */
  marcas: string[];
  /** El IVA completo del cargo (el acreditable del documento del libro); «0.00» si no hay marca de IVA o no se conoce. */
  ivaEnRiesgo: string;
  /** El cargo completo sin IVA; «0.00» si no hay marca de ISR. */
  costoNoDeducible: string;
  /** Saldo inicial con efecto: no se sabe cuánto IVA tenía. */
  ivaNoConocido: boolean;
}

/** Un pago en efectivo del mes con sus cargos. */
export interface PagoEnEfectivoDto {
  pagoId: string;
  recibo: string;
  fecha: string;
  retiro: string | null;
  monto: string;
  /** Se registró con la excepción (permiso y motivo). */
  sinBancarizar: boolean;
  motivoSinBancarizar: string | null;
  cargos: CargoDeBancarizacionDto[];
}

/** Un mes de un proveedor cuya suma llega al umbral y que tuvo pagos en efectivo. */
export interface MesDeBancarizacionDto {
  proveedorId: string;
  proveedorNombre: string;
  /** `AAAA-MM`. */
  mes: string;
  /** Lo pagado al proveedor en el mes con cheques, notas, notas ligadas y efectivo (misma suma que CP4). */
  sumaDelMes: string;
  /** Lo pagado en efectivo de los pagos que salen. */
  efectivo: string;
  /** El IVA completo de los cargos del mes, cada cargo una sola vez. */
  ivaEnRiesgo: string;
  costoNoDeducible: string;
  pagos: PagoEnEfectivoDto[];
}

/** Un pago (de cualquier forma) que entregó algo a un documento sobre el umbral. */
export interface PagoDeUnDocumentoDto {
  pagoId: string;
  numero: string;
  forma: FormaDePago;
  fecha: string;
  monto: string;
}

/** Un documento del umbral o más pagado en parte en efectivo, aunque ningún mes llegue al umbral. */
export interface DocumentoSobreElUmbralDto extends CargoDeBancarizacionDto {
  proveedorId: string;
  proveedorNombre: string;
  total: string;
  /** Lo que se le pagó en efectivo. */
  efectivo: string;
  pagos: PagoDeUnDocumentoDto[];
}

export interface CifrasDeBancarizacionDto {
  cantidad: number;
  efectivo: string;
  ivaEnRiesgo: string;
  costoNoDeducible: string;
}

export interface ReporteDeBancarizacionDto {
  desde: string;
  hasta: string;
  /** El umbral configurado hoy, en quetzales. */
  umbral: string;
  meses: MesDeBancarizacionDto[];
  documentosSobreElUmbral: DocumentoSobreElUmbralDto[];
  totales: {
    meses: CifrasDeBancarizacionDto;
    documentos: CifrasDeBancarizacionDto;
    /** Cada cargo una sola vez, aunque salga en las dos secciones. */
    total: { ivaEnRiesgo: string; costoNoDeducible: string };
  };
  leyendas: string[];
}
