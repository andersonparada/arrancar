import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ActivoConMovimientos } from '../../../dominio/errores-de-activo.js';
import { activoExistente } from '../activos/dependencias-de-activos.js';
import { exigirCargaAbierta, type DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';

export class EliminarSaldoInicial {
  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {}

  /**
   * Elimina el activo de saldo inicial con su costo, su saldo y sus tramos (la carga debe estar abierta y sin cierres).
   * Queda en la auditoría con el saldo como estaba.
   * @throws RecursoNoEncontrado si no existe o no viene de un saldo inicial.
   * @throws CargaInicialCerrada o SaldosConCierres si ya no se puede eliminar.
   * @throws ActivoConMovimientos si tiene componentes o movimientos (traslados, costos de líneas, cuotas).
   */
  ejecutar(operador: Operador, activoId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await exigirCargaAbierta(this.dependencias, operador);
      const anterior = await consultas.obtener(activoId);
      const activo = await activoExistente(repositorio, activoId);
      const conComponentes = await repositorio.tieneComponentes(activo.id);
      if (conComponentes || (await repositorio.tieneMovimientos(activo.id))) throw new ActivoConMovimientos();
      await repositorio.eliminar(activo);
      await auditoria.registrar({
        recurso: 'activos-fijos.saldos-iniciales',
        registroId: activoId,
        accion: 'eliminar',
        anterior,
      });
    });
  }
}
