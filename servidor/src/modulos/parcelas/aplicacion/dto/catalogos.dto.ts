/** Una opción para elegir en las ventanas de Parcelas: el registro y cómo se llama. */
export interface OpcionDeCatalogoDto {
  id: string;
  nombre: string;
}

/** Lo que Parcelas ofrece para elegir sin pedir los permisos de Empresas. */
export interface CatalogosDeParcelasDto {
  localidades: OpcionDeCatalogoDto[];
  inmuebles: OpcionDeCatalogoDto[];
}
