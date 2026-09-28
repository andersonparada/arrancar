import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { SoloSeEliminaLaUltima } from '../../../dominio/errores.js';
import { conciliacionExistente, type DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

interface SolicitudDeEliminacion {
  conciliacionId: string;
  motivo: string;
}

/**
 * Elimina la última conciliación de su cuenta (abierta o cerrada) y suelta sus
 * movimientos, así se reabre el mes; queda en la auditoría con el motivo.
 */
export class EliminarConciliacion {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /** @throws SoloSeEliminaLaUltima si no es la más reciente de su cuenta. */
  ejecutar(operador: Operador, { conciliacionId, motivo }: SolicitudDeEliminacion): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliacion = await conciliacionExistente(repositorio, conciliacionId);
      const { cuentaBancariaId } = conciliacion.instantanea();
      const ultima = await repositorio.ultimaDeLaCuenta(cuentaBancariaId);
      if (ultima?.id !== conciliacionId) throw new SoloSeEliminaLaUltima();

      const anterior = await consultas.obtener(conciliacionId);
      await repositorio.guardarMarcas(conciliacionId, []);
      await repositorio.eliminar(conciliacion.id);
      await auditoria.registrar({
        recurso: 'bancos.conciliaciones',
        registroId: conciliacionId,
        accion: 'eliminar',
        anterior,
        motivo,
      });
    });
  }
}
