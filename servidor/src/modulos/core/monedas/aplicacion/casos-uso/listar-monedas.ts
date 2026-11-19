import type { CatalogoDeMonedas, MonedaDto } from '../puertos/monedas.js';

interface Dependencias {
  catalogo: CatalogoDeMonedas;
}

/** El catálogo de monedas con su código del Banguat y si ya tienen tipos cargados. Lo ve cualquier usuario con sesión. */
export class ListarMonedas {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(): Promise<MonedaDto[]> {
    return this.dependencias.catalogo.listar();
  }
}
