/** Concepto de ingreso tal como lo ve el usuario en pantalla. */
export interface ConceptoDeIngresoDto {
  id: string;
  nombre: string;
  tipo: 'bien' | 'servicio';
  /** Los de sistema (`venta_de_activo_fijo`) no se editan, inactivan ni eliminan. */
  claveDeSistema: 'venta_de_activo_fijo' | null;
  activo: boolean;
}

/** Lo que se recibe para registrar o cambiar un concepto de ingreso, ya validado en su forma. */
export type SolicitudDeConceptoDeIngreso = Omit<ConceptoDeIngresoDto, 'id' | 'claveDeSistema'>;
