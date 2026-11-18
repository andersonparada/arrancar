import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { RevisionDeCierreDeModulo } from '../../../../core/contratos/empresas.contratos.js';
import { revisionDeCierreDeCuentasPorPagar } from '../../../dominio/revision-de-cierre.js';
import type { ConsultasDeCuadre } from '../../puertos/puertos-de-cuadre.js';

export interface DependenciasDeLaRevisionDeCierre {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeCuadre;
}

/**
 * La revisión de Cuentas por pagar al cerrar la carga inicial (EM-2): avisos y cifras del cuadre de los saldos
 * iniciales de la empresa del operador. Empresas junta las revisiones de los módulos y decide si pide motivo.
 */
export class RevisarCierreDeCargaEnCuentasPorPagar {
  constructor(private readonly dependencias: DependenciasDeLaRevisionDeCierre) {}

  ejecutar(operador: Operador, { fechaDeInicio }: { fechaDeInicio: string }): Promise<RevisionDeCierreDeModulo> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const proveedores = await consultas.sumasPorProveedor();
      const librosAnteriores = await consultas.documentosDelLibroAnterioresA(fechaDeInicio);
      return revisionDeCierreDeCuentasPorPagar({ fechaDeInicio, proveedores, librosAnteriores });
    });
  }
}
