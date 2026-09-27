import type { NivelConfiguracion } from '../../../modulos-sistema/definicion-modulo.js';
import { definicionDeLaVariable } from '../definicion-de-la-variable.js';
import type { Alcance } from '../dto/variable.dto.js';
import type { CatalogoDeVariables } from '../puertos/catalogo-de-variables.js';
import type { RepositorioConfiguraciones } from '../puertos/repositorio-configuraciones.js';

interface Dependencias {
  repositorio: RepositorioConfiguraciones;
  catalogo: CatalogoDeVariables;
}

export interface ValorARestablecer extends Alcance {
  clave: string;
  nivel: NivelConfiguracion;
}

/** Quita el valor del nivel para que vuelva a heredar del nivel superior. */
export class RestablecerValor {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si la variable no existe entre las de los módulos activos. */
  async ejecutar({ destino, modulosActivos, clave, nivel }: ValorARestablecer): Promise<void> {
    definicionDeLaVariable(this.dependencias.catalogo, clave, modulosActivos);
    await this.dependencias.repositorio.eliminar(nivel, destino, clave);
  }
}
