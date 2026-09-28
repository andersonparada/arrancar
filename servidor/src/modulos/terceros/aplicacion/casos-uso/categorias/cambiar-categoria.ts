import { auditarCambioDeEstado, type Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
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
  auditoria: Auditoria;
}

export class CambiarCategoria {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si la categoría no existe en la cuenta. */
  ejecutar(
    operador: Operador,
    cambio: { categoriaId: string; solicitud: SolicitudDeCategoria },
  ): Promise<CategoriaDto> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const categoria = await categoriaExistente(repositorio, cambio.categoriaId);
      const anterior = await consultas.obtener(cambio.categoriaId);
      categoria.cambiarDatos(cambio.solicitud);
      await repositorio.guardar(categoria);
      await auditarCambioDeEstado(auditoria, {
        recurso: 'terceros.categorias',
        registroId: cambio.categoriaId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: cambio.solicitud.activo,
      });
      return consultas.obtener(cambio.categoriaId);
    });
  }
}
