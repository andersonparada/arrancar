import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { MetodoDeCosteo } from '../../../dominio/costeo/tipos.js';
import { aDiezmilesimas } from '../../../dominio/decimales.js';
import type { SaldoInicialDto } from '../../dto/saldo-inicial.dto.js';
import { eventoDeRecalculo } from '../../kardex/eventos-del-kardex.js';
import { RecalculadorDeArticulo } from '../../kardex/recalculador-de-articulo.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';

const MOTIVO_DEL_DOCUMENTO_VACIO = 'Se quitó su último renglón de saldo inicial.';

/**
 * Quita un renglón de saldo inicial del kardex en tres pasos que quien llama intercala con lo suyo: `desactivar` (el
 * movimiento deja de valer), `recalcular` (el costo de lo que vino después; falla si una existencia queda negativa) y
 * `cerrar` (devuelve la existencia a la bodega y anula el documento si se quedó sin renglones). Todo dentro de la unidad
 * de trabajo de quien llama.
 */
export class RetiradorDeSaldos {
  private readonly recalculador: RecalculadorDeArticulo;

  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {
    this.recalculador = new RecalculadorDeArticulo(dependencias.almacen);
  }

  /**
   * Toma los candados del artículo del renglón (y de los que se sumen) y lo lee ya con ellos en la mano: así no lo
   * quitan dos a la vez.
   * @throws RecursoNoEncontrado si el renglón no existe, ya no es vigente o su bodega no se ve.
   */
  async tomar(movimientoId: string, tambienArticulos: readonly string[]): Promise<SaldoInicialDto> {
    const { saldos, almacen } = this.dependencias;
    const visto = await saldos.obtener(movimientoId);
    if (!visto) throw new RecursoNoEncontrado('El saldo inicial');
    await almacen.bloquear([visto.articuloId, ...tambienArticulos]);
    const anterior = await saldos.obtener(movimientoId);
    if (!anterior) throw new RecursoNoEncontrado('El saldo inicial');
    return anterior;
  }

  desactivar(anterior: SaldoInicialDto): Promise<void> {
    return this.dependencias.almacen.desactivarMovimiento(anterior.id);
  }

  /** Vuelve a costear el artículo del renglón con causa `saldo_inicial_corregido`. */
  async recalcular(
    operador: Operador,
    datos: { anterior: SaldoInicialDto; metodo: MetodoDeCosteo },
  ): Promise<EventoDominio[]> {
    const { anterior, metodo } = datos;
    const causa = 'saldo_inicial_corregido';
    const cambios = await this.recalculador.recalcular({
      articuloId: anterior.articuloId,
      metodo,
      causa,
      documentoCausaId: anterior.documentoId,
      movimientosNuevos: new Set(),
    });
    const evento = eventoDeRecalculo({
      empresaId: operador.empresaId,
      causa,
      documentoId: anterior.documentoId,
      ...cambios,
    });
    return evento ? [evento] : [];
  }

  async cerrar(operador: Operador, anterior: SaldoInicialDto): Promise<void> {
    const { existencias, almacen } = this.dependencias;
    await existencias.mover([
      {
        bodegaId: anterior.bodegaId,
        articuloId: anterior.articuloId,
        loteId: anterior.loteId,
        cantidad: -aDiezmilesimas(anterior.cantidadBase),
      },
    ]);
    const quedan = await almacen.movimientosDelDocumento(anterior.documentoId);
    if (!quedan.some((movimiento) => movimiento.vigente)) await this.anularDocumentoVacio(operador, anterior);
  }

  /** Un documento sin renglones no tiene sentido: se anula y la auditoría guarda cómo estaba. */
  private async anularDocumentoVacio(operador: Operador, anterior: SaldoInicialDto): Promise<void> {
    const { documentos, consultas, auditoria } = this.dependencias;
    const antes = await consultas.documento(anterior.documentoId);
    const anulacion = { motivo: MOTIVO_DEL_DOCUMENTO_VACIO, usuarioId: operador.usuarioId, ahora: new Date() };
    await documentos.anular(anterior.documentoId, anulacion);
    await auditoria.registrar({
      recurso: 'inventarios.saldos-iniciales',
      registroId: anterior.documentoId,
      accion: 'anular',
      anterior: antes,
      motivo: MOTIVO_DEL_DOCUMENTO_VACIO,
    });
  }
}
