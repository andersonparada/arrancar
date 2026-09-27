import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import type { ConsultasGeografia, MunicipioDto } from '../puertos/consultas-geografia.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasGeografia;
}

/** Municipios de un departamento, ordenados por su código del INE. */
export class ListarMunicipios {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, departamentoCodigo: string): Promise<MunicipioDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listarMunicipios(departamentoCodigo));
  }
}
