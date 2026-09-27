import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import type { ConsultasGeografia, DepartamentoDto } from '../puertos/consultas-geografia.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasGeografia;
}

/** Los 22 departamentos de Guatemala, ordenados por su código del INE. */
export class ListarDepartamentos {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador): Promise<DepartamentoDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listarDepartamentos());
  }
}
