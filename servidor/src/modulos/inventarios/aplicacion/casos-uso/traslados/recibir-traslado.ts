import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { BodegaFueraDeAlcance, DocumentoYaAnulado, TrasladoYaRecibido } from '../../../dominio/errores-de-kardex.js';
import type { DocumentoDto, SolicitudDeRecepcionDeTraslado, VistaDelKardex } from '../../dto/documento.dto.js';
import { eventoDeTraslado } from '../../kardex/eventos-del-kardex.js';
import { RecepcionDeTraslado } from '../../kardex/recepcion-de-traslado.js';
import { documentoSegunLaVista } from '../../kardex/vista-del-kardex.js';
import type { DocumentoGuardado } from '../../puertos/repositorio-de-documentos.js';
import type { DependenciasDeTraslados } from './dependencias-de-traslados.js';

export interface RecepcionPedida extends SolicitudDeRecepcionDeTraslado {
  /** El documento de la salida del traslado. */
  documentoId: string;
}

/** Registra en la bodega de destino lo que llegó de un traslado en tránsito (§6.7). */
export class RecibirTraslado {
  private readonly recepcion: RecepcionDeTraslado;

  constructor(private readonly dependencias: DependenciasDeTraslados) {
    this.recepcion = new RecepcionDeTraslado(dependencias);
  }

  /**
   * Crea la entrada con fecha igual o posterior a la de la salida (hoy si no se escribe) y pasa la salida a `recibido`.
   * Se registra completa: si faltó mercadería, lo que faltó va a un ajuste. Publica `traslado_registrado`.
   * @throws RecursoNoEncontrado si el traslado no existe o el usuario no ve ni su origen ni su destino.
   * @throws BodegaFueraDeAlcance si el usuario no tiene asignada la bodega de destino.
   * @throws TrasladoYaRecibido si ya se recibió. @throws DocumentoYaAnulado si se anuló.
   * @throws DocumentoInvalido si la fecha es anterior a la de la salida.
   */
  async ejecutar(operador: Operador, pedido: RecepcionPedida, vista: VistaDelKardex): Promise<DocumentoDto> {
    const { unidadDeTrabajo, publicadorEventos, consultas } = this.dependencias;
    const { eventos, dto } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const eventos = await this.recibir(operador, pedido);
      return { eventos, dto: await consultas.documento(pedido.documentoId) };
    });
    await publicadorEventos.publicar(eventos);
    return documentoSegunLaVista(dto, vista);
  }

  private async recibir(operador: Operador, pedido: RecepcionPedida): Promise<EventoDominio[]> {
    const { almacen, catalogos, reloj } = this.dependencias;
    const movimientos = await almacen.movimientosDelDocumento((await this.buscar(pedido.documentoId)).id);
    await almacen.bloquear(movimientos.map((m) => m.articuloId));
    const salida = await this.buscar(pedido.documentoId);
    if (salida.estado === 'anulado') throw new DocumentoYaAnulado();
    if (salida.estadoDeTraslado === 'recibido') throw new TrasladoYaRecibido();
    if (!(await catalogos.bodega(salida.bodegaDeDestinoId!))) {
      throw new BodegaFueraDeAlcance('Solo quien tiene asignada la bodega de destino puede recibir el traslado.');
    }
    const fecha = pedido.fecha ?? (await reloj.hoy(operador));
    const hecho = await this.recepcion.registrar(operador, {
      salida,
      movimientosDeLaSalida: movimientos,
      fecha,
      observaciones: pedido.observaciones,
    });
    const datos = { empresaId: operador.empresaId, salida: hecho.salida, movimientos, articulos: hecho.articulos };
    return [eventoDeTraslado(datos), ...hecho.entrada.eventosDeRecalculo];
  }

  private async buscar(documentoId: string): Promise<DocumentoGuardado> {
    const documento = await this.dependencias.documentos.buscar(documentoId);
    if (!documento || documento.clase !== 'salida_de_traslado') throw new RecursoNoEncontrado('El traslado');
    return documento;
  }
}
