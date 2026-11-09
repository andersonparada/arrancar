import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { REGLAS_PARA_CORREGIR_SALDO_INICIAL } from '../../../dominio/reglas-de-saldo-inicial.js';
import type { ReglaDeBaja } from '../../../dominio/reglas-de-baja.js';
import type { SaldoInicialDto, SolicitudDeSaldoInicial } from '../../dto/saldo-inicial.dto.js';
import { revisarReglasDeBaja } from '../bajas/preparar-la-baja.js';
import {
  bloquearSaldoInicial,
  dtoDelSaldoInicial,
  exigirCargaAbierta,
  RECURSO_DE_SALDOS_INICIALES,
  type DependenciasDeSaldosIniciales,
} from './dependencias-de-saldos-iniciales.js';
import { PreparadorDeSaldoInicial } from './preparador-de-saldo-inicial.js';

/**
 * Corrige un saldo inicial por errores de carga, solo con la carga abierta, completado (no autorizado) y sin notas
 * aplicadas ni, más adelante, contraseñas o pagos (`REGLAS_PARA_CORREGIR_SALDO_INICIAL`). Vuelve a validar todo, deja
 * `registrado_en/por` en quien corrige (así tampoco autoriza lo que corrigió sin `autorizar-propios`) y audita
 * `corregir` con el saldo inicial como estaba.
 */
export class CorregirSaldoInicial {
  private readonly preparador: PreparadorDeSaldoInicial;

  constructor(
    private readonly dependencias: DependenciasDeSaldosIniciales,
    private readonly reglas: readonly ReglaDeBaja[] = REGLAS_PARA_CORREGIR_SALDO_INICIAL,
  ) {
    this.preparador = new PreparadorDeSaldoInicial(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado si no es un saldo inicial de la empresa; los errores de la carga, de las reglas y de
   * los datos, como al crear.
   */
  ejecutar(operador: Operador, id: string, solicitud: SolicitudDeSaldoInicial): Promise<SaldoInicialDto> {
    const { unidadDeTrabajo, cargaInicial, documentos, saldosIniciales, consultas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const fechaDeInicio = await exigirCargaAbierta(cargaInicial, operador);
      await revisarReglasDeBaja(this.reglas, await bloquearSaldoInicial(documentos, id));
      const saldo = await this.preparador.preparar(operador, solicitud, fechaDeInicio);
      const anterior = await dtoDelSaldoInicial(consultas, id, false);
      await auditoria.registrar({ recurso: RECURSO_DE_SALDOS_INICIALES, registroId: id, accion: 'corregir', anterior });
      await saldosIniciales.reemplazar(id, saldo, operador.usuarioId);
      return dtoDelSaldoInicial(consultas, id, false);
    });
  }
}
