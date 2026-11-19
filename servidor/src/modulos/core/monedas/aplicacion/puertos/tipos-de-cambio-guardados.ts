/** Una versión guardada de un tipo de cambio (`core.tipos_de_cambio`); los decimales viajan como texto. */
export interface TipoDeCambioDto {
  id: string;
  moneda: string;
  /** El día en que rige, `AAAA-MM-DD`. */
  fecha: string;
  referencia: string;
  compra: string | null;
  venta: string | null;
  origen: 'banguat' | 'manual';
  /** Solo las versiones manuales. */
  motivo: string | null;
  /** Nombre de usuario de quien la registró (solo las manuales). */
  registradoPor: string | null;
  registradoEn: string;
}

/** Una versión manual de soporte, con los decimales ya validados. */
export interface NuevoTipoManual {
  moneda: string;
  fecha: string;
  referencia: string;
  compra: string | null;
  venta: string | null;
  motivo: string;
  usuarioId: string;
}

/**
 * Los tipos de cambio de toda la instalación. La tabla solo crece: corregir un tipo es agregar otra versión de la misma
 * moneda y fecha, y la vigente es la última registrada. Lee con la transacción en curso si la hay.
 */
export interface TiposDeCambioGuardados {
  /** La versión vigente del día más reciente que no pasa de `fecha`. */
  vigenteHasta(moneda: string, fecha: string): Promise<TipoDeCambioDto | null>;
  /** La versión vigente de cada día con tipo entre dos fechas, por fecha. */
  serie(moneda: string, desde: string, hasta: string): Promise<TipoDeCambioDto[]>;
  /** Todas las versiones de un día, de la más nueva a la más vieja. */
  versiones(moneda: string, fecha: string): Promise<TipoDeCambioDto[]>;
  /** Corre dentro de la unidad de trabajo del caso de uso. */
  agregarManual(nuevo: NuevoTipoManual): Promise<TipoDeCambioDto>;
}
