export const CAUSAS_DE_BAJA = [
  'venta',
  'destruccion',
  'robo',
  'extravio',
  'donacion',
  'obsolescencia',
  'faltante_de_inventario',
  'devuelto_al_dueno',
  'otra',
] as const;
export type CausaDeBaja = (typeof CAUSAS_DE_BAJA)[number];

/** Quién firma el acta (V-12): la empresa (administrativa) o un notario. */
export const TIPOS_DE_ACTA = ['administrativa', 'notarial'] as const;
export type TipoDeActa = (typeof TIPOS_DE_ACTA)[number];

export type EstadoDeBaja = 'vigente' | 'anulada';

/** Las causas que dejan constancia en un acta y una denuncia: robo y extravío. */
export const CAUSAS_CON_DENUNCIA: readonly CausaDeBaja[] = ['robo', 'extravio'];

/**
 * De dónde sale el costo fiscal de una venta (AF-9b): `en_libros` (el del activo con libros, o cero en el bien de
 * control de quien lleva contabilidad completa), `documentado` (el costo de compra respaldado), `sin_documento` (cero,
 * sin respaldo) o `criterio_del_contador` (lo escribió quien tiene el permiso, con su motivo).
 */
export const ORIGENES_DEL_COSTO_FISCAL = [
  'en_libros',
  'documentado',
  'sin_documento',
  'criterio_del_contador',
] as const;
export type OrigenDelCostoFiscal = (typeof ORIGENES_DEL_COSTO_FISCAL)[number];

/** El origen del costo fiscal de una venta y, si lo escribió el contador, su motivo. */
export interface CostoFiscalDeLaVenta {
  origen: OrigenDelCostoFiscal;
  motivo: string | null;
}

/** La venta: a quién, por cuánto y la factura (FEL) que se emitió afuera. Todo el dinero en centavos. */
export interface DatosDeVenta {
  comprador: string;
  nitDelComprador: string;
  precioCentavos: number;
  ivaCentavos: number;
  serieFel: string | null;
  numeroFel: string;
  autorizacionFel: string;
}

/** Lo que escribe quien da de baja o vende. */
export interface DatosDeBaja {
  fecha: string;
  causa: CausaDeBaja;
  descripcion: string;
  autorizadaPor: string;
  destinoDelBien: string | null;
  numeroDeDenuncia: string | null;
  /** El inventario que propuso el faltante (llega con AF-12). */
  inventarioId: string | null;
  venta: DatosDeVenta | null;
}

/**
 * Lo que se congela en la baja (§6.8), en centavos: al día de la baja, con la cuota del mes si la convención la
 * deprecia. El costo fiscal es el que se recupera al vender (A1).
 */
export interface CifrasDeBaja {
  costoCentavos: number;
  depreciacionAcumuladaContableCentavos: number;
  valorEnLibrosCentavos: number;
  costoFiscalCentavos: number;
  baseFiscalCentavos: number;
  depreciacionAcumuladaFiscalCentavos: number;
  valorFiscalPorDepreciarCentavos: number;
  cuotaDelMesContableCentavos: number;
  cuotaDelMesFiscalCentavos: number;
}

/** El número del acta que le tocó del correlativo de la empresa (los activos de una misma baja lo comparten). */
export interface NumeroDeActa {
  numero: number;
  anioDeNumero: number;
}
