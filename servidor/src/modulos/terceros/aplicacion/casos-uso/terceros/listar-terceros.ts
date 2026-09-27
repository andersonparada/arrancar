import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { FiltrosDeTerceros, TerceroEnListadoDto } from '../../dto/tercero.dto.js';
import type { ConsultasTerceros } from '../../puertos/consultas.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasTerceros;
}

/** Terceros de la cuenta, con búsqueda por nombre, NIT, DPI o teléfono y filtros por papel y estado. */
export class ListarTerceros {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, filtros: FiltrosDeTerceros): Promise<TerceroEnListadoDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar(filtros));
  }
}
