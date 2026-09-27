import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { AlcanceDelOperador } from '../alcance-del-operador.js';
import type { EmpresaDto } from '../dto/empresa.dto.js';
import type { ConsultasEmpresas } from '../puertos/consultas-empresas.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasEmpresas;
  alcance: AlcanceDelOperador;
}

/** Empresas de la cuenta que el operador puede ver, activas o no, ordenadas por nombre. */
export class ListarEmpresas {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador): Promise<EmpresaDto[]> {
    const { unidadDeTrabajo, consultas, alcance } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () =>
      alcance.filtrar(operador, await consultas.listarDeCuenta(operador.cuentaId)),
    );
  }
}
