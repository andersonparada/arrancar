import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { BodegaFueraDeAlcance, TrasladoYaRecibido } from '../../../dominio/errores-de-kardex.js';
import type { DocumentoDto, VistaDelKardex } from '../../dto/documento.dto.js';
import { documentoSegunLaVista } from '../../kardex/vista-del-kardex.js';
import type { DocumentoGuardado } from '../../puertos/repositorio-de-documentos.js';
import { AnularDocumento, motivoValido, type AnulacionPedida } from '../movimientos/anular-documento.js';
import type { DependenciasDeTraslados } from './dependencias-de-traslados.js';

/** Una salida de traslado ya recibida no se anula sola: primero su recepción (la anula este caso de uso). */
const sinRecepcionVigente = async (documento: DocumentoGuardado): Promise<void> => {
  if (documento.estadoDeTraslado === 'recibido') {
    throw new TrasladoYaRecibido(
      'El traslado ya se recibió: anule el traslado completo para anular también la recepción.',
    );
  }
};

/** Anula un traslado entero (§3.8): en tránsito, su salida; recibido, la entrada y luego la salida. */
export class AnularTraslado {
  private readonly anularSalida: AnularDocumento;
  private readonly anularEntrada: AnularDocumento;

  constructor(private readonly dependencias: DependenciasDeTraslados) {
    this.anularSalida = new AnularDocumento(dependencias, 'salida_de_traslado', sinRecepcionVigente);
    this.anularEntrada = new AnularDocumento(dependencias, 'entrada_de_traslado');
  }

  /**
   * Anula con motivo, solo en mes abierto y si al quitar los movimientos ninguna existencia queda negativa. Exige ver el
   * origen (y el destino, si ya se recibió). Deja la auditoría `anular` de cada mitad y publica `documento_anulado`.
   * @throws RecursoNoEncontrado si el traslado no existe o el usuario no lo ve.
   * @throws BodegaFueraDeAlcance si falta ver el origen o, recibido, el destino.
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
    const { almacen, documentos } = this.dependencias;
    const antes = await this.buscar(pedido.documentoId);
    await almacen.bloquear((await almacen.movimientosDelDocumento(antes.id)).map((m) => m.articuloId));
    const salida = await this.buscar(pedido.documentoId);
    await this.exigirVer(salida.bodegaId!, 'el origen');
    if (salida.estadoDeTraslado === 'en_transito') return this.anularSalida.anularEnLaTransaccion(operador, pedido);
    const entrada = await this.buscarEntrada(salida);
    const deLaEntrada = await this.anularEntrada.anularEnLaTransaccion(operador, {
      ...pedido,
      documentoId: entrada.id,
    });
    await documentos.cambiarTraslado(salida.id, { estadoDeTraslado: 'en_transito', documentoRelacionadoId: null });
    return [...deLaEntrada, ...(await this.anularSalida.anularEnLaTransaccion(operador, pedido))];
  }

  private async buscar(documentoId: string): Promise<DocumentoGuardado> {
    const documento = await this.dependencias.documentos.buscar(documentoId);
    if (!documento || documento.clase !== 'salida_de_traslado') throw new RecursoNoEncontrado('El traslado');
    return documento;
  }

  /** Una salida anulada no tiene a quién anular: el documento ya lo dice (`DocumentoYaAnulado`). */
  private async buscarEntrada(salida: DocumentoGuardado): Promise<DocumentoGuardado> {
    const entrada = salida.documentoRelacionadoId
      ? await this.dependencias.documentos.buscar(salida.documentoRelacionadoId)
      : null;
    if (!entrada) throw new BodegaFueraDeAlcance('Anular un traslado recibido exige ver también la bodega de destino.');
    return entrada;
  }

  private async exigirVer(bodegaId: string, cual: string): Promise<void> {
    if (!(await this.dependencias.catalogos.bodega(bodegaId))) {
      throw new BodegaFueraDeAlcance(`Anular el traslado exige ver ${cual}: no la tiene asignada.`);
    }
  }
}
