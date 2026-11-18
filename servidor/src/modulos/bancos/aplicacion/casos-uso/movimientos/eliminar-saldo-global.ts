import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { CuentaConConciliaciones } from '../../../dominio/errores.js';
import type { ConsultasConciliaciones } from '../../puertos/consultas-conciliaciones.js';
import type { ConsultasMovimientos } from '../../puertos/consultas-movimientos.js';
import type { RepositorioMovimientos } from '../../puertos/repositorio-movimientos.js';
import { movimientoExistente } from './dependencias-de-movimientos.js';

interface EliminacionDeSaldoGlobal {
  movimientoId: string;
  motivo: string;
}

/** Lo que usa `EliminarSaldoGlobal`. */
export interface DependenciasDeEliminarSaldoGlobal {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioMovimientos;
  consultas: ConsultasMovimientos;
  consultasConciliaciones: ConsultasConciliaciones;
  auditoria: Auditoria;
}

/**
 * HEREDADO, hasta que el cliente use la pantalla nueva (BS-5): elimina de verdad el saldo global «de antes» de una
 * cuenta, solo si esta nunca tuvo ninguna conciliación. El nuevo es `saldos-iniciales/EliminarSaldoInicial`.
 */
export class EliminarSaldoGlobal {
  constructor(private readonly dependencias: DependenciasDeEliminarSaldoGlobal) {}

  /**
   * @throws NoEsUnSaldoInicial si el movimiento es una nota.
   * @throws CuentaConConciliaciones si la cuenta ya tiene alguna conciliación.
   */
  ejecutar(operador: Operador, { movimientoId, motivo }: EliminacionDeSaldoGlobal): Promise<void> {
    const { unidadDeTrabajo, repositorio, consultas, consultasConciliaciones, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const movimiento = await movimientoExistente(repositorio, movimientoId);
      movimiento.exigirClase(true);
      const anterior = await consultas.obtener(movimientoId);
      if (await consultasConciliaciones.tieneAlguna(anterior.cuentaBancariaId)) throw new CuentaConConciliaciones();
      await repositorio.eliminar(movimiento.id);
      await auditoria.registrar({
        recurso: 'bancos.movimientos',
        registroId: movimientoId,
        accion: 'eliminar',
        anterior,
        motivo,
      });
    });
  }
}
