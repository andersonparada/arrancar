/** Una opción para elegir en las ventanas de Parcelas: el registro y cómo se llama. */
export interface OpcionDeCatalogoDto {
  id: string;
  nombre: string;
}

/** Un tipo de parcela para elegir; los inactivos viajan marcados para que la pantalla conserve el que una parcela ya tiene. */
export interface TipoParaElegirDto extends OpcionDeCatalogoDto {
  activo: boolean;
}

/** Lo que Parcelas ofrece para elegir sin pedir los permisos de Empresas. */
export interface CatalogosDeParcelasDto {
  localidades: OpcionDeCatalogoDto[];
  inmuebles: OpcionDeCatalogoDto[];
  tipos: TipoParaElegirDto[];
}
