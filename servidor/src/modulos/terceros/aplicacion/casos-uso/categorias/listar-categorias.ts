import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { CategoriaDto } from '../../dto/categoria.dto.js';
import type { ConsultasCategorias } from '../../puertos/consultas.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasCategorias;
}

/** Categorías de proveedor de la cuenta, activas o no, ordenadas por nombre. */
export class ListarCategorias {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador): Promise<CategoriaDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}
