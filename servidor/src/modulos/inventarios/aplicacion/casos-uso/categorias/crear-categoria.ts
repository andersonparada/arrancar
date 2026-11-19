import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Categoria } from '../../../dominio/categoria.js';
import { datosDeCategoria } from '../../datos-de-categoria.js';
import type { CategoriaDto, SolicitudDeCategoria } from '../../dto/categoria.dto.js';
import type { DependenciasDeCategorias } from './dependencias-de-categorias.js';

export class CrearCategoria {
  constructor(private readonly dependencias: DependenciasDeCategorias) {}

  /**
   * @throws CategoriaInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si repite un dato que debe ser único.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeCategoria): Promise<CategoriaDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const categoria = Categoria.crear(Identificador.desde(operador.empresaId), datosDeCategoria(solicitud));
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await repositorio.agregar(categoria);
      return consultas.obtener(categoria.id.valor);
    });
  }
}
