import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { CuentaConConciliaciones } from '../../../dominio/errores.js';
import type { ConsultasConciliaciones } from '../../puertos/consultas-conciliaciones.js';
import type { ConsultasMovimientos } from '../../puertos/consultas-movimientos.js';
import type { RepositorioMovimientos } from '../../puertos/repositorio-movimientos.js';
import { movimientoExistente } from './dependencias-de-movimientos.js';

interface EliminacionDeSaldoInicial {
  movimientoId: string;
  motivo: string;
}

/** Lo que usa `EliminarSaldoInicial`. */
export interface DependenciasDeEliminarSaldoInicial {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioMovimientos;
  consultas: ConsultasMovimientos;
  consultasConciliaciones: ConsultasConciliaciones;
  auditoria: Auditoria;
}

/** Elimina de verdad el saldo inicial de una cuenta, solo si esta nunca tuvo ninguna conciliación. */
export class EliminarSaldoInicial {
  constructor(private readonly dependencias: DependenciasDeEliminarSaldoInicial) {}

  /**
   * @throws NoEsUnSaldoInicial si el movimiento es una nota.
   * @throws CuentaConConciliaciones si la cuenta ya tiene alguna conciliación.
   */
  ejecutar(operador: Operador, { movimientoId, motivo }: EliminacionDeSaldoInicial): Promise<void> {
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
