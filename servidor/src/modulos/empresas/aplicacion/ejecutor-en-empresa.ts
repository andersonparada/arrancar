import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { AlcanceDelOperador } from './alcance-del-operador.js';
import type { ConsultasEmpresas } from './puertos/consultas-empresas.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasEmpresas;
  alcance: AlcanceDelOperador;
}

/**
 * Trabaja sobre los datos de una empresa de la cuenta que no tiene por qué ser la activa (el
 * formulario de Empresas edita cualquiera): abre la transacción con esa empresa como contexto de
 * seguridad, para que la seguridad por filas la deje ver, y antes exige que sea de la cuenta del
 * operador y que este tenga acceso a ella.
 */
export class EjecutorEnEmpresa {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si no es de la cuenta o el operador no tiene acceso a ella. */
  ejecutar<Resultado>(operador: Operador, empresaId: string, trabajo: () => Promise<Resultado>): Promise<Resultado> {
    const { unidadDeTrabajo, consultas, alcance } = this.dependencias;
    return unidadDeTrabajo.ejecutar({ ...operador, empresaId }, async () => {
      await consultas.obtenerEnCuenta(empresaId, operador.cuentaId);
      await alcance.exigirAcceso(operador, empresaId);
      return trabajo();
    });
  }
}
