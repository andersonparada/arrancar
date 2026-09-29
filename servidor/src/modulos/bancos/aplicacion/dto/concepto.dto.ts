/** Concepto tal como lo ve el usuario en pantalla. */
export interface ConceptoDto {
  id: string;
  nombre: string;
  aplicaA: 'credito' | 'debito' | 'ambos';
  actividadDeFlujo: 'operacion' | 'inversion' | 'financiamiento' | 'ninguna';
  grupoDeFlujo: string | null;
  esCargoBancario: boolean;
  pideDatosDeIntereses: boolean;
  admiteFactura: boolean;
  activo: boolean;
  /** Solo los conceptos que usa el sistema la tienen; esos no se editan, inactivan ni eliminan. */
  claveDeSistema: string | null;
}

/** Lo que se recibe para registrar o cambiar un concepto, ya validado en su forma. */
export type SolicitudDeConcepto = Omit<ConceptoDto, 'id' | 'claveDeSistema'>;
