import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ActivoConMovimientos } from '../../../dominio/errores-de-activo.js';
import { activoExistente, type DependenciasDeActivos } from './dependencias-de-activos.js';

export class EliminarActivo {
  constructor(private readonly dependencias: DependenciasDeActivos) {}

  /**
   * Queda en la auditoría con cómo estaba (ficha con su historial de ubicación y sus costos). Sus costos se borran con él.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws ActivoConMovimientos si tiene traslados, componentes, costos vigentes de líneas del libro o (en los pasos siguientes) cuotas o bajas.
   */
  ejecutar(operador: Operador, activoId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, consultasDeCostos, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const activo = await activoExistente(repositorio, activoId);
      const conComponentes = await repositorio.tieneComponentes(activo.id);
      if (conComponentes || (await repositorio.tieneMovimientos(activo.id))) throw new ActivoConMovimientos();
      const anterior = {
        ...(await consultas.obtener(activoId)),
        costos: (await consultasDeCostos.deActivo(activoId)).costos,
      };
      await repositorio.eliminar(activo);
      await auditoria.registrar({
        recurso: 'activos-fijos.activos',
        registroId: activoId,
        accion: 'eliminar',
        anterior,
      });
    });
  }
}
