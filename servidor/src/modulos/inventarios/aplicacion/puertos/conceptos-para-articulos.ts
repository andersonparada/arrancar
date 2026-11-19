/** Un concepto de gasto del Libro de compras que el artículo puede proponer a sus salidas a gasto. */
export interface ConceptoParaArticulo {
  id: string;
  nombre: string;
}

/** Los conceptos de gasto de la empresa, por nombre; la seguridad por empresa (RLS) limita lo que se ve. */
export interface ConceptosParaArticulos {
  listar(): Promise<ConceptoParaArticulo[]>;
}
