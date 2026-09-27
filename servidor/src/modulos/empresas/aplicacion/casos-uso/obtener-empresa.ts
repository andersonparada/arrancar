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

export class ObtenerEmpresa {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si no es de la cuenta o el operador no tiene acceso a ella. */
  ejecutar(operador: Operador, empresaId: string): Promise<EmpresaDto> {
    const { unidadDeTrabajo, consultas, alcance } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const empresa = await consultas.obtenerEnCuenta(empresaId, operador.cuentaId);
      await alcance.exigirAcceso(operador, empresaId);
      return empresa;
    });
  }
}
