import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { MetodoDeLaEmpresa } from '../../kardex/metodo-de-la-empresa.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';
import { exigirCargaAbierta } from './guardias-de-la-carga.js';
import { RetiradorDeSaldos } from './retirador-de-saldos.js';

export class EliminarSaldoInicial {
  private readonly retirador: RetiradorDeSaldos;
  private readonly metodo: MetodoDeLaEmpresa;

  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {
    this.retirador = new RetiradorDeSaldos(dependencias);
    this.metodo = new MetodoDeLaEmpresa(dependencias);
  }

  /**
   * Quita un renglón de saldo inicial con la carga abierta (§8): deja de valer, el costo de lo posterior se recalcula
   * (causa `saldo_inicial_corregido`) y la auditoría (`eliminar`) guarda el renglón como estaba. Si era el último del
   * documento de su bodega, el documento se anula. Publica `costo_recalculado` si algo cambió.
   * @throws RecursoNoEncontrado si el renglón no existe, ya no es vigente o su bodega no se ve.
   * @throws CargaInicialCerrada, SaldosConCierres, ExistenciaNegativa si lo posterior dependía de él.
   */
  async ejecutar(operador: Operador, movimientoId: string): Promise<void> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const eventos = await unidadDeTrabajo.ejecutar(operador, () => this.eliminar(operador, movimientoId));
    await publicadorEventos.publicar(eventos);
  }

  private async eliminar(operador: Operador, movimientoId: string) {
    await exigirCargaAbierta(this.dependencias, operador);
    const anterior = await this.retirador.tomar(movimientoId, []);
    await this.retirador.desactivar(anterior);
    const metodo = await this.metodo.usarParaMover(operador, anterior.fechaDeCapa);
    const eventos = await this.retirador.recalcular(operador, { anterior, metodo });
    await this.retirador.cerrar(operador, anterior);
    await this.dependencias.auditoria.registrar({
      recurso: 'inventarios.saldos-iniciales',
      registroId: anterior.id,
      accion: 'eliminar',
      anterior,
    });
    return eventos;
  }
}
