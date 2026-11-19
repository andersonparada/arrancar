/** Un concepto de gasto del libro de compras y la clase que propone para sus líneas capitalizables. */
export interface ConceptoDeClaseDto {
  conceptoDeGastoId: string;
  nombre: string;
  /** La clase que propone hoy; nulo si ninguna. */
  claseId: string | null;
}
