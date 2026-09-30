/** Concepto de gasto tal como lo ve el usuario en pantalla. */
export interface ConceptoDeGastoDto {
  id: string;
  nombre: string;
  tipoPorOmision: 'bien' | 'servicio';
  esProductoAgropecuario: boolean;
  esActivoFijo: boolean;
  activo: boolean;
}

/** Lo que se recibe para registrar o cambiar un concepto de gasto, ya validado en su forma. */
export type SolicitudDeConceptoDeGasto = Omit<ConceptoDeGastoDto, 'id'>;
