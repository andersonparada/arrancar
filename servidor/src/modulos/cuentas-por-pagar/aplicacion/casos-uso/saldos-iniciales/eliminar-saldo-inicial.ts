import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import { REGLAS_PARA_CORREGIR_SALDO_INICIAL } from '../../../dominio/reglas-de-saldo-inicial.js';
import type { ReglaDeBaja } from '../../../dominio/reglas-de-baja.js';
import { revisarReglasDeBaja } from '../bajas/preparar-la-baja.js';
import {
  bloquearSaldoInicial,
  dtoDelSaldoInicial,
  exigirCargaAbierta,
  RECURSO_DE_SALDOS_INICIALES,
  type DependenciasDeSaldosIniciales,
} from './dependencias-de-saldos-iniciales.js';

/**
 * Elimina un saldo inicial (con motivo) solo con la carga abierta y bajo las mismas reglas que corregirlo. Audita
 * `eliminar` con el saldo inicial como estaba y el motivo, en la misma transacción. No toca Libro de compras: un saldo
 * inicial no tiene documento allá.
 */
export class EliminarSaldoInicial {
  constructor(
    private readonly dependencias: DependenciasDeSaldosIniciales,
    private readonly reglas: readonly ReglaDeBaja[] = REGLAS_PARA_CORREGIR_SALDO_INICIAL,
  ) {}

  /**
   * @throws MotivoInvalido, RecursoNoEncontrado, FechaDeInicioSinRegistrar, CargaInicialCerradaParaSaldos,
   * SaldoInicialAutorizado, SaldoInicialConMovimientos
   */
  async ejecutar(operador: Operador, id: string, motivo: string): Promise<void> {
    const { unidadDeTrabajo, cargaInicial, documentos, consultas, auditoria } = this.dependencias;
    const motivoLimpio = motivoValido(motivo);
    await unidadDeTrabajo.ejecutar(operador, async () => {
      await exigirCargaAbierta(cargaInicial, operador);
      await revisarReglasDeBaja(this.reglas, await bloquearSaldoInicial(documentos, id));
      const anterior = await dtoDelSaldoInicial(consultas, id, false);
      await auditoria.registrar({
        recurso: RECURSO_DE_SALDOS_INICIALES,
        registroId: id,
        accion: 'eliminar',
        anterior,
        motivo: motivoLimpio,
      });
      await documentos.eliminar(id);
    });
  }
}
