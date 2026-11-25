import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { LlaveDeEnlace, RolDeCuenta } from '../../../../core/contratos/contabilidad.contratos.js';
import { DEFINICIONES_DE_ROLES } from '../../../dominio/roles-de-enlace.js';
import type { DependenciasDeEnlaces } from './dependencias-de-enlaces.js';

/** Los registros de los otros módulos con los que se puede enlazar un rol (cuentas bancarias, conceptos, reglas…). */
export class ListarLlavesDeEnlace {
  constructor(private readonly dependencias: Pick<DependenciasDeEnlaces, 'unidadDeTrabajo' | 'llaves'>) {}

  /** Los roles sin llave no ofrecen ninguna. Cada llave sale una vez, por nombre. */
  ejecutar(operador: Operador, rol: RolDeCuenta): Promise<LlaveDeEnlace[]> {
    const { unidadDeTrabajo, llaves } = this.dependencias;
    if (!DEFINICIONES_DE_ROLES[rol].admiteLlave) return Promise.resolve([]);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const ofrecidas = await llaves.de(operador, rol);
      const sinRepetir = new Map(ofrecidas.map((llave) => [llave.llave, llave]));
      return [...sinRepetir.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    });
  }
}
