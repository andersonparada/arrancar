import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { CategoriaDto, SolicitudDeCategoria } from '../../dto/categoria.dto.js';
import { categoriaExistente } from '../../existentes.js';
import type { ConsultasCategorias } from '../../puertos/consultas.js';
import type { RepositorioCategorias } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioCategorias;
  consultas: ConsultasCategorias;
}

export class CambiarCategoria {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si la categoría no existe en la cuenta. */
  ejecutar(
    operador: Operador,
    cambio: { categoriaId: string; solicitud: SolicitudDeCategoria },
  ): Promise<CategoriaDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const categoria = await categoriaExistente(repositorio, cambio.categoriaId);
      categoria.cambiarDatos(cambio.solicitud);
      await repositorio.guardar(categoria);
      return consultas.obtener(cambio.categoriaId);
    });
  }
}
