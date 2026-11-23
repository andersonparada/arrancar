import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { SaldoInicialDto, SolicitudDeSaldoInicial } from '../../dto/saldo-inicial.dto.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';
import { exigirCargaAbierta, exigirMetodoElegido } from './guardias-de-la-carga.js';
import { RegistradorDeSaldos } from './registrador-de-saldos.js';

export class RegistrarSaldoInicial {
  private readonly registrador: RegistradorDeSaldos;

  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {
    this.registrador = new RegistradorDeSaldos(dependencias);
  }

  /**
   * Anota un renglón de saldo inicial (§8): lo que la empresa tenía de un artículo en una bodega y lote al día anterior
   * a su fecha de inicio, con su costo total. Va al documento `saldo_inicial` de la bodega (se crea con el primero).
   * Solo con la carga abierta, sin cierres y con el método de costeo ya elegido. Publica `costo_recalculado` si
   * alguna salida posterior cambió de costo.
   * @throws SaldoInicialSinFechaDeInicio, CargaInicialCerrada, SaldosConCierres, MetodoDeCosteoSinElegir.
   * @throws RecursoNoEncontrado, DocumentoInvalido, LoteObligatorio, LoteInvalido, UnidadSinConversion, ElementoInactivo.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeSaldoInicial): Promise<SaldoInicialDto> {
    const { unidadDeTrabajo, publicadorEventos, saldos } = this.dependencias;
    const { eventos, dto } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const fechaDeInicio = await exigirCargaAbierta(this.dependencias, operador);
      await exigirMetodoElegido(this.dependencias);
      const pedido = { solicitud, fechaDeInicio, causa: 'registro_con_fecha_anterior' } as const;
      const registro = await this.registrador.registrar(operador, pedido);
      return { eventos: registro.eventosDeRecalculo, dto: await saldos.obtener(registro.nuevos[0]!.id) };
    });
    await publicadorEventos.publicar(eventos);
    return dto!;
  }
}
