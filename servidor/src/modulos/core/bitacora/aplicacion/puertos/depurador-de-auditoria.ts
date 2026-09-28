/** Borra la auditoría vieja; lo anterior se consulta en los respaldos. */
export interface DepuradorDeAuditoria {
  /** @returns cuántas entradas se borraron. */
  borrarAnterioresA(meses: number): Promise<number>;
}
