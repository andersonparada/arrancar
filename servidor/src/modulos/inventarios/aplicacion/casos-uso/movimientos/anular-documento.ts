import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { MovimientoDelKardex } from '../../../dominio/costeo/movimientos-del-kardex.js';
import { TIPO_DE_MOVIMIENTO_POR_CLASE, type ClaseDeDocumento } from '../../../dominio/documento.js';
import { DocumentoInvalido, DocumentoYaAnulado, MesCerrado } from '../../../dominio/errores-de-kardex.js';
import type { DocumentoDto, VistaDelKardex } from '../../dto/documento.dto.js';
import type { DependenciasDelKardex } from '../../kardex/dependencias-del-kardex.js';
import { eventoDeAnulacion, eventoDeRecalculo } from '../../kardex/eventos-del-kardex.js';
import { MetodoDeLaEmpresa } from '../../kardex/metodo-de-la-empresa.js';
import { RecalculadorDeArticulo } from '../../kardex/recalculador-de-articulo.js';
import { periodoDe } from '../../kardex/registrador-de-documento.js';
import { documentoSegunLaVista } from '../../kardex/vista-del-kardex.js';
import type { DocumentoGuardado } from '../../puertos/repositorio-de-documentos.js';

/** El recurso de auditoría de cada clase (`inventarios.<plural del documento>`, §10.2). */
const RECURSO_DE_AUDITORIA: Record<ClaseDeDocumento, string> = {
  entrada_manual: 'inventarios.entradas',
  salida_por_consumo: 'inventarios.salidas',
};

export interface AnulacionPedida {
  documentoId: string;
  motivo: string;
}

function motivoValido(motivo: string): string {
  const limpio = motivo.trim();
  if (!limpio) throw new DocumentoInvalido('Escriba el motivo de la anulación.');
  if (limpio.length > 300) throw new DocumentoInvalido('El motivo no puede pasar de 300 caracteres.');
  return limpio;
}

/** Anula un documento vigente de una clase (§3.8): sus movimientos dejan de valer y el costo se recalcula. */
export class AnularDocumento {
  private readonly recalculador: RecalculadorDeArticulo;
  private readonly metodo: MetodoDeLaEmpresa;

  constructor(
    private readonly dependencias: DependenciasDelKardex,
    private readonly clase: ClaseDeDocumento,
  ) {
    this.recalculador = new RecalculadorDeArticulo(dependencias.almacen);
    this.metodo = new MetodoDeLaEmpresa(dependencias);
  }

  /**
   * Anula con motivo, en el mismo instante que deja la auditoría con cómo estaba. Solo en un mes abierto y si al quitar
   * sus movimientos ninguna existencia queda negativa en ninguna fecha. Publica `documento_anulado` (y
   * `costo_recalculado` si cambió el costo de salidas posteriores).
   * @throws RecursoNoEncontrado si no existe, no es de esa clase o el usuario no ve su bodega.
   * @throws DocumentoYaAnulado, MesCerrado, ExistenciaNegativa, DocumentoInvalido (motivo).
   */
  async ejecutar(operador: Operador, pedido: AnulacionPedida, vista: VistaDelKardex): Promise<DocumentoDto> {
    const { unidadDeTrabajo, publicadorEventos, consultas } = this.dependencias;
    const motivo = motivoValido(pedido.motivo);
    const { eventos, dto } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const eventos = await this.anular(operador, { documentoId: pedido.documentoId, motivo });
      return { eventos, dto: await consultas.documento(pedido.documentoId) };
    });
    await publicadorEventos.publicar(eventos);
    return documentoSegunLaVista(dto, vista);
  }

  private async anular(operador: Operador, pedido: AnulacionPedida): Promise<EventoDominio[]> {
    const { almacen, documentos, existencias, consultas } = this.dependencias;
    const { documento, movimientos } = await this.cargarYBloquear(pedido.documentoId);
    const anterior = await consultas.documento(documento.id);
    await almacen.desactivarMovimientosDelDocumento(documento.id);
    const eventos = await this.recalcular(operador, { documento, movimientos });
    await existencias.mover(this.reversa(documento, movimientos));
    await documentos.anular(documento.id, { motivo: pedido.motivo, usuarioId: operador.usuarioId, ahora: new Date() });
    await this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_AUDITORIA[documento.clase],
      registroId: documento.id,
      accion: 'anular',
      anterior,
      motivo: pedido.motivo,
    });
    return [eventoDeAnulacion(operador.empresaId, documento), ...eventos];
  }

  /** Toma los candados antes de revisar el estado: otra anulación del mismo documento espera y lo ve ya anulado. */
  private async cargarYBloquear(documentoId: string) {
    const { almacen } = this.dependencias;
    const movimientos = await almacen.movimientosDelDocumento((await this.buscar(documentoId)).id);
    await almacen.bloquear(movimientos.map((m) => m.articuloId));
    const documento = await this.buscar(documentoId);
    await this.exigirVigenteYAbierto(documento);
    return { documento, movimientos };
  }

  private async buscar(documentoId: string): Promise<DocumentoGuardado> {
    const documento = await this.dependencias.documentos.buscar(documentoId);
    if (!documento || documento.clase !== this.clase) throw new RecursoNoEncontrado('El documento');
    return documento;
  }

  private async exigirVigenteYAbierto(documento: DocumentoGuardado): Promise<void> {
    if (documento.estado === 'anulado') throw new DocumentoYaAnulado();
    if (await this.dependencias.cierres.estaCerrado(periodoDe(documento.fecha))) {
      throw new MesCerrado(periodoDe(documento.fecha));
    }
  }

  private async recalcular(
    operador: Operador,
    datos: { documento: DocumentoGuardado; movimientos: readonly MovimientoDelKardex[] },
  ): Promise<EventoDominio[]> {
    const { documento, movimientos } = datos;
    const metodo = await this.metodo.usarParaMover(operador, documento.fecha);
    const eventos: EventoDominio[] = [];
    for (const articuloId of [...new Set(movimientos.map((m) => m.articuloId))].sort()) {
      const diferencias = await this.recalculador.recalcular({
        articuloId,
        metodo,
        causa: 'anulacion',
        documentoCausaId: documento.id,
        movimientosNuevos: new Set(),
      });
      const evento = eventoDeRecalculo({
        empresaId: operador.empresaId,
        causa: 'anulacion',
        documentoId: documento.id,
        diferencias,
      });
      if (evento) eventos.push(evento);
    }
    return eventos;
  }

  /** Lo que el documento sumó a las existencias, al revés. */
  private reversa(documento: DocumentoGuardado, movimientos: readonly MovimientoDelKardex[]) {
    const signo = TIPO_DE_MOVIMIENTO_POR_CLASE[documento.clase] === 'entrada' ? -1n : 1n;
    return movimientos.map((m) => ({
      bodegaId: documento.bodegaId,
      articuloId: m.articuloId,
      loteId: m.loteId,
      cantidad: signo * (m.cantidad < 0n ? -m.cantidad : m.cantidad),
    }));
  }
}
