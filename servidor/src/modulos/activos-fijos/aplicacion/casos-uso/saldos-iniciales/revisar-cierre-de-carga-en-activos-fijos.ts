import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { RevisionDeCierreDeModulo } from '../../../../core/contratos/empresas.contratos.js';
import { fechaDeCorteDe } from '../../../dominio/saldos-iniciales/saldo-inicial.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';
import { revisionDeCierreDeActivosFijos } from './revision-de-cierre.js';

type Lectura = Pick<DependenciasDeSaldosIniciales, 'unidadDeTrabajo' | 'consultas'>;

/**
 * La revisión de Activos fijos al cerrar la carga inicial (EM-2): avisos y cifras del cuadre de los saldos iniciales de
 * la empresa del operador. Empresas junta las revisiones de los módulos activos.
 */
export class RevisarCierreDeCargaEnActivosFijos {
  constructor(private readonly dependencias: Lectura) {}

  ejecutar(operador: Operador, { fechaDeInicio }: { fechaDeInicio: string }): Promise<RevisionDeCierreDeModulo> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () =>
      revisionDeCierreDeActivosFijos(await consultas.listar(), fechaDeCorteDe(fechaDeInicio)),
    );
  }
}
