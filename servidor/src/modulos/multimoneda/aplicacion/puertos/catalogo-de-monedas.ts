/** Una moneda del catálogo de la instalación (`core.monedas`), tal como la necesita Multimoneda. */
export interface MonedaDelCatalogo {
  codigo: string;
  nombre: string;
  simbolo: string;
  decimales: number;
  activa: boolean;
}

/** Las monedas de la instalación; las lee del núcleo (Multimoneda no tiene tablas de monedas). */
export interface CatalogoDeMonedasDelNucleo {
  listar(): Promise<MonedaDelCatalogo[]>;
}
