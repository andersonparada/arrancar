import { Identificador } from '../../../compartido/dominio/identificador.js';
import type { EstadoDeModuloDto } from '../dto/cuenta.dto.js';
import type { CatalogoDeModulos } from '../puertos/catalogo-de-modulos.js';
import type { RepositorioCuentas } from '../puertos/repositorio-cuentas.js';

interface Dependencias {
  repositorio: RepositorioCuentas;
  catalogo: CatalogoDeModulos;
}

/** El catálogo con el estado de cada módulo en la cuenta; sin cuenta, solo los esenciales están activos. */
export class ListarModulos {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(cuentaId?: string): Promise<EstadoDeModuloDto[]> {
    const { repositorio, catalogo } = this.dependencias;
    const contratados = cuentaId ? await repositorio.modulosContratados(Identificador.desde(cuentaId)) : [];
    return catalogo.estados(catalogo.activos(contratados));
  }
}
