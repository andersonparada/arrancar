import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeCategoria } from '../../datos-de-categoria.js';
import type { CategoriaDto, SolicitudDeCategoria } from '../../dto/categoria.dto.js';
import { categoriaExistente, type DependenciasDeCategorias } from './dependencias-de-categorias.js';

interface CambioDeCategoria {
  categoriaId: string;
  solicitud: SolicitudDeCategoria;
}

export class ActualizarCategoria {
  constructor(private readonly dependencias: DependenciasDeCategorias) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, { categoriaId, solicitud }: CambioDeCategoria): Promise<CategoriaDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const categoria = await categoriaExistente(repositorio, categoriaId);
      const anterior = await consultas.obtener(categoriaId);
      categoria.cambiarDatos(datosDeCategoria(solicitud));
      await repositorio.guardar(categoria);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'inventarios.categorias',
        registroId: categoriaId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(categoriaId);
    });
  }
}
