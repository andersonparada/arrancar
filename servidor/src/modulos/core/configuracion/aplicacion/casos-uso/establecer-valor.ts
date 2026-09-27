import type { NivelConfiguracion } from '../../../modulos-sistema/definicion-modulo.js';
import { NivelNoPermitido, ValorDeConfiguracionInvalido } from '../../dominio/errores.js';
import { definicionDeLaVariable } from '../definicion-de-la-variable.js';
import type { Alcance } from '../dto/variable.dto.js';
import type { CatalogoDeVariables } from '../puertos/catalogo-de-variables.js';
import type { RepositorioConfiguraciones } from '../puertos/repositorio-configuraciones.js';

interface Dependencias {
  repositorio: RepositorioConfiguraciones;
  catalogo: CatalogoDeVariables;
}

export interface NuevoValor extends Alcance {
  clave: string;
  nivel: NivelConfiguracion;
  valor: unknown;
  usuarioId: string;
}

export class EstablecerValor {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si la variable no existe entre las de los módulos activos.
   * @throws NivelNoPermitido si la variable no admite ese nivel.
   * @throws ValorDeConfiguracionInvalido si el valor no cumple el esquema de la variable.
   */
  async ejecutar({ destino, modulosActivos, clave, nivel, valor, usuarioId }: NuevoValor): Promise<void> {
    const definicion = definicionDeLaVariable(this.dependencias.catalogo, clave, modulosActivos);
    if (!definicion.niveles.includes(nivel)) throw new NivelNoPermitido(nivel);
    const validado = definicion.esquema.safeParse(valor);
    if (!validado.success) throw new ValorDeConfiguracionInvalido(validado.error.issues[0]?.message);
    await this.dependencias.repositorio.guardar({ nivel, destino, clave, valor: validado.data, usuarioId });
  }
}
