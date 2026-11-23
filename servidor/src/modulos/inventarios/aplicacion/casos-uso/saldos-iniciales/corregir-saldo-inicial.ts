import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { SaldoInicialDto, SolicitudDeSaldoInicial } from '../../dto/saldo-inicial.dto.js';
import { MetodoDeLaEmpresa } from '../../kardex/metodo-de-la-empresa.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';
import { exigirCargaAbierta } from './guardias-de-la-carga.js';
import { RegistradorDeSaldos } from './registrador-de-saldos.js';
import { RetiradorDeSaldos } from './retirador-de-saldos.js';

export class CorregirSaldoInicial {
  private readonly registrador: RegistradorDeSaldos;
  private readonly retirador: RetiradorDeSaldos;
  private readonly metodo: MetodoDeLaEmpresa;

  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {
    this.registrador = new RegistradorDeSaldos(dependencias);
    this.retirador = new RetiradorDeSaldos(dependencias);
    this.metodo = new MetodoDeLaEmpresa(dependencias);
  }

  /**
   * Corrige un renglón de saldo inicial con la carga abierta (§8): el renglón anterior deja de valer y el nuevo se anota
   * en el documento de su bodega, y el costo de lo posterior se recalcula una sola vez (causa `saldo_inicial_corregido`).
   * Deja en la auditoría (`corregir`) el renglón como estaba. Publica `costo_recalculado` si algo cambió.
   * @throws RecursoNoEncontrado si el renglón no existe, ya no es vigente o su bodega no se ve.
   * @throws CargaInicialCerrada, SaldosConCierres, ExistenciaNegativa y los errores de `RegistrarSaldoInicial`.
   */
  async ejecutar(
    operador: Operador,
    movimientoId: string,
    solicitud: SolicitudDeSaldoInicial,
  ): Promise<SaldoInicialDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { eventos, dto } = await unidadDeTrabajo.ejecutar(operador, () =>
      this.corregir(operador, { movimientoId, solicitud }),
    );
    await publicadorEventos.publicar(eventos);
    return dto!;
  }

  private async corregir(operador: Operador, datos: { movimientoId: string; solicitud: SolicitudDeSaldoInicial }) {
    const { solicitud } = datos;
    const fechaDeInicio = await exigirCargaAbierta(this.dependencias, operador);
    const anterior = await this.retirador.tomar(datos.movimientoId, [solicitud.articuloId]);
    await this.retirador.desactivar(anterior);
    const causa = 'saldo_inicial_corregido';
    const registro = await this.registrador.registrar(operador, { solicitud, fechaDeInicio, causa });
    const eventos = [...registro.eventosDeRecalculo, ...(await this.completar(operador, anterior, solicitud))];
    const { auditoria, saldos } = this.dependencias;
    await auditoria.registrar({
      recurso: 'inventarios.saldos-iniciales',
      registroId: anterior.id,
      accion: 'corregir',
      anterior,
    });
    return { eventos, dto: await saldos.obtener(registro.nuevos[0]!.id) };
  }

  /** Si el artículo cambió, el anterior también se vuelve a costear; luego se devuelve su existencia a la bodega. */
  private async completar(
    operador: Operador,
    anterior: SaldoInicialDto,
    solicitud: SolicitudDeSaldoInicial,
  ): Promise<EventoDominio[]> {
    const eventos: EventoDominio[] = [];
    if (anterior.articuloId !== solicitud.articuloId) {
      const metodo = await this.metodo.usarParaMover(operador, anterior.fechaDeCapa);
      eventos.push(...(await this.retirador.recalcular(operador, { anterior, metodo })));
    }
    await this.retirador.cerrar(operador, anterior);
    return eventos;
  }
}
