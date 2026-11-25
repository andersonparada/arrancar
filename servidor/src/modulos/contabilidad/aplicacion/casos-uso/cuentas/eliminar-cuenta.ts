import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { CuentaConHijas } from '../../../dominio/errores.js';
import { cuentaExistente, type DependenciasDeCuentas } from './dependencias-de-cuentas.js';

export class EliminarCuenta {
  constructor(private readonly dependencias: DependenciasDeCuentas) {}

  /**
   * Queda en la auditoría con cómo estaba. Si tiene movimientos o enlaces, la llave foránea lo impide
   * (`RecursoEnUso`): se inactiva en vez de eliminarse.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws CuentaConHijas si tiene cuentas inferiores.
   */
  ejecutar(operador: Operador, cuentaId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const cuenta = await cuentaExistente(repositorio, cuentaId);
      if (await repositorio.tieneHijas(cuenta.id)) throw new CuentaConHijas();
      const anterior = await consultas.obtener(cuentaId);
      await repositorio.eliminar(cuenta);
      await auditoria.registrar({
        recurso: 'contabilidad.cuentas',
        registroId: cuentaId,
        accion: 'eliminar',
        anterior,
      });
    });
  }
}
