import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { SaldoConMovimientosPosteriores } from '../../../dominio/errores-de-saldo-inicial.js';
import { corregirActivoDeSaldoInicial } from '../../../dominio/saldos-iniciales/activo-de-saldo-inicial.js';
import type { SaldoInicialDto, SolicitudDeSaldoInicial } from '../../dto/saldo-inicial.dto.js';
import type { TopesPorInciso } from '../../puertos/lector-de-topes.js';
import { activoExistente } from '../activos/dependencias-de-activos.js';
import { ArmadorDeSaldoInicial } from './armador-de-saldo-inicial.js';
import { exigirCargaAbierta, type DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';

interface CorreccionDeSaldo {
  activoId: string;
  solicitud: SolicitudDeSaldoInicial;
}

export class CorregirSaldoInicial {
  private readonly armador: ArmadorDeSaldoInicial;

  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {
    this.armador = new ArmadorDeSaldoInicial(dependencias);
  }

  /**
   * Cambia el saldo inicial de un activo con la carga abierta y sin cierres: rehace el activo, su costo, sus montos y
   * sus tramos. Queda en la auditoría como `corregir`, con el saldo como estaba.
   * @throws RecursoNoEncontrado si no existe o no viene de un saldo inicial.
   * @throws CargaInicialCerrada o SaldosConCierres si ya no se puede cambiar.
   * @throws SaldoConMovimientosPosteriores si el activo recibió costos de otro origen o se puso en uso.
   * @throws SaldoInicialInvalido, ActivoInvalido u otro error de datos si no cumple las reglas.
   */
  async ejecutar(operador: Operador, pedido: CorreccionDeSaldo): Promise<SaldoInicialDto> {
    const topes = await this.dependencias.topes.paraEmpresa(operador);
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, () => this.corregir(operador, pedido, topes));
  }

  /** Sus libros deben ser solo los del saldo: sin costos de otro origen ni tramos de otra causa (como el inicio de uso). */
  private async exigirSoloSaldoInicial(activoId: string): Promise<void> {
    const { costos, tramos } = this.dependencias;
    const conCostosAjenos = (await costos.vigentesDeActivo(activoId)).some(
      (costo) => costo.instantanea().origen !== 'saldo_inicial',
    );
    const conTramosAjenos = (await tramos.vigentesDeActivo(activoId)).some((tramo) => tramo.causa !== 'saldo_inicial');
    if (conCostosAjenos || conTramosAjenos) throw new SaldoConMovimientosPosteriores();
  }

  private async corregir(operador: Operador, { activoId, solicitud }: CorreccionDeSaldo, topes: TopesPorInciso) {
    const { repositorio, consultas, auditoria } = this.dependencias;
    const fechaDeInicio = await exigirCargaAbierta(this.dependencias, operador);
    const anterior = await consultas.obtener(activoId);
    const actual = await activoExistente(repositorio, activoId);
    await this.exigirSoloSaldoInicial(activoId);
    const { claseId, codigo } = actual.instantanea();
    const { plan, inciso } = await this.armador.armar(operador, {
      solicitud,
      fechaDeInicio,
      topes,
      actual: { id: activoId, claseId, codigo },
    });
    const corregido = corregirActivoDeSaldoInicial(actual, plan.activo, inciso);
    await repositorio.guardar(corregido);
    await repositorio.actualizarAlta(corregido);
    await this.armador.reemplazarLibros(operador, activoId, plan);
    await auditoria.registrar({
      recurso: 'activos-fijos.saldos-iniciales',
      registroId: activoId,
      accion: 'corregir',
      anterior,
    });
    return consultas.obtener(activoId);
  }
}
