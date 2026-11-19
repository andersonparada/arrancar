import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { motivoValido } from '../../../dominio/nuevo-movimiento.js';
import {
  abrirEscritura,
  exigirSinConciliaciones,
  RECURSO_DE_SALDOS_INICIALES,
  type DependenciasDeSaldosIniciales,
} from './dependencias-de-saldos-iniciales.js';

/**
 * Elimina de verdad el saldo inicial de una cuenta con todas sus partidas (y los cheques de la chequera de apertura),
 * con motivo, solo con la carga abierta y la cuenta sin conciliaciones. Audita `eliminar` con la ficha completa y
 * borra también el archivo de la evidencia, si lo hay.
 */
export class EliminarSaldoInicial {
  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {}

  /**
   * @throws RecursoNoEncontrado si la cuenta no tiene saldo inicial; MotivoDeAnulacionInvalido; SinFechaDeInicio,
   *   CargaInicialCerrada o AperturaConConciliacion.
   */
  ejecutar(operador: Operador, { cuentaBancariaId, motivo }: { cuentaBancariaId: string; motivo: string }) {
    const motivoLimpio = motivoValido(motivo);
    const { unidadDeTrabajo, consultasConciliaciones, cabeceras, auditoria, ficha } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { cabecera } = await abrirEscritura(this.dependencias, operador, cuentaBancariaId);
      if (!cabecera) throw new RecursoNoEncontrado('El saldo inicial');
      await exigirSinConciliaciones(consultasConciliaciones, cuentaBancariaId);
      const anterior = await ficha.deLaCuenta(operador, cuentaBancariaId);
      await auditoria.registrar({
        recurso: RECURSO_DE_SALDOS_INICIALES,
        registroId: cabecera.id,
        accion: 'eliminar',
        anterior,
        motivo: motivoLimpio,
      });
      await this.eliminarLasPartidas(cuentaBancariaId);
      await cabeceras.eliminar(cabecera.id);
      if (cabecera.evidenciaArchivoId) {
        await this.dependencias.documentos.eliminar(cabecera.evidenciaArchivoId, RECURSO_DE_SALDOS_INICIALES);
      }
    });
  }

  private async eliminarLasPartidas(cuentaBancariaId: string): Promise<void> {
    const { consultas, chequesDeApertura, repositorioMovimientos } = this.dependencias;
    for (const { movimientoId } of await consultas.partidas(cuentaBancariaId)) {
      await chequesDeApertura.liberar(movimientoId);
      await repositorioMovimientos.eliminar(Identificador.desde(movimientoId));
    }
  }
}
