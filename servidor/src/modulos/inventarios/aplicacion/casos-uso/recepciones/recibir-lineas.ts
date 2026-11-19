import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { lotePermitido } from '../../../dominio/lote.js';
import { LineaNoRecibible } from '../../../dominio/errores-de-recepcion.js';
import type { LineaDeCompra } from '../../../dominio/linea-de-compra.js';
import type { PlanDeDocumento } from '../../../dominio/plan-de-documento.js';
import { planesDeRecepcion, type RenglonRecibido } from '../../../dominio/recepcion.js';
import type { DocumentoDto, RenglonSolicitado, VistaDelKardex } from '../../dto/documento.dto.js';
import type { RenglonDeRecepcionSolicitado, SolicitudDeRecepcion } from '../../dto/por-recibir.dto.js';
import { eventoDeRecepcion } from '../../kardex/eventos-de-recepciones.js';
import { RegistradorDeDocumento, type ResultadoDeRegistro } from '../../kardex/registrador-de-documento.js';
import { ResolutorDeRenglones, type RenglonesResueltos } from '../../kardex/resolutor-de-renglones.js';
import { documentoSegunLaVista } from '../../kardex/vista-del-kardex.js';
import type { DependenciasDeRecepciones } from './dependencias-de-recepciones.js';

export class RecibirLineas {
  private readonly registrador: RegistradorDeDocumento;
  private readonly resolutor: ResolutorDeRenglones;

  constructor(private readonly dependencias: DependenciasDeRecepciones) {
    this.registrador = new RegistradorDeDocumento(dependencias);
    this.resolutor = new ResolutorDeRenglones(dependencias.catalogos);
  }

  /**
   * Recibe en una bodega lo que dicen las líneas del libro (§6.3): un documento `recepcion_de_compra` por documento del
   * libro, con una entrada por renglón al costo del monto escrito. Toma el candado de cada línea (la suma de lo recibido
   * no pasa de su costo) y el de cada artículo. Recibir en partes deja el resto en la bandeja. Un lote nuevo se crea al
   * recibir. Publica `entrada_registrada` (y `costo_recalculado` si algo cambió) al confirmar.
   * @throws LineaNoRecibible, LineaDescartada, LineaSobrerrecibida según el libro.
   * @throws RecursoNoEncontrado si la bodega, un artículo, una unidad o un lote no existen o no se ven.
   * @throws DocumentoInvalido, ExistenciaNegativa, MesCerrado, FechaAnteriorAlInicio, LoteObligatorio, UnidadSinConversion.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeRecepcion, vista: VistaDelKardex): Promise<DocumentoDto[]> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { registros, articulos, dtos } = await unidadDeTrabajo.ejecutar(operador, () =>
      this.recibir(operador, solicitud),
    );
    const eventos = registros.flatMap(({ documento, movimientos, eventosDeRecalculo }) => [
      eventoDeRecepcion({ empresaId: operador.empresaId, documento, movimientos, articulos }),
      ...eventosDeRecalculo,
    ]);
    await publicadorEventos.publicar(eventos);
    return dtos.map((dto) => documentoSegunLaVista(dto, vista));
  }

  private async recibir(operador: Operador, solicitud: SolicitudDeRecepcion) {
    const { lineas, almacen } = this.dependencias;
    const lineaIds = [...new Set(solicitud.renglones.map((renglon) => renglon.lineaId))];
    await lineas.bloquear(lineaIds);
    await almacen.bloquear(solicitud.renglones.map((renglon) => renglon.articuloId));
    const resueltos = await this.resolver(operador, solicitud);
    const recibidos = await this.recibidos(solicitud, resueltos);
    const planes = planesDeRecepcion({ ...solicitud, renglones: recibidos });
    const registros: ResultadoDeRegistro[] = [];
    for (const plan of planes) {
      registros.push(await this.registrador.registrar(operador, { plan, articulos: resueltos.articulos }));
    }
    const dtos = await this.documentosDe(registros, planes);
    return { registros, articulos: resueltos.articulos, dtos };
  }

  /** Cada renglón ya resuelto, junto con su línea del libro. */
  private async recibidos(solicitud: SolicitudDeRecepcion, resueltos: RenglonesResueltos): Promise<RenglonRecibido[]> {
    const lineaIds = [...new Set(solicitud.renglones.map((renglon) => renglon.lineaId))];
    const deLaBase = await this.lineasDelLibro(lineaIds);
    return resueltos.renglones.map((renglon, indice) => ({
      linea: deLaBase.get(solicitud.renglones[indice]!.lineaId)!,
      renglon,
    }));
  }

  private documentosDe(registros: readonly ResultadoDeRegistro[], planes: readonly PlanDeDocumento[]) {
    return Promise.all(
      registros.map(async ({ documento }, indice) => ({
        ...(await this.dependencias.consultas.documento(documento.id)),
        avisos: [...planes[indice]!.avisos],
      })),
    );
  }

  private async lineasDelLibro(lineaIds: readonly string[]): Promise<Map<string, LineaDeCompra>> {
    const encontradas = new Map((await this.dependencias.lineas.buscar(lineaIds)).map((l) => [l.lineaId, l]));
    if (lineaIds.some((id) => !encontradas.has(id))) throw new LineaNoRecibible();
    return encontradas;
  }

  /** Crea los lotes nuevos y pasa los renglones a la unidad base, con el monto de cada uno como su costo. */
  private async resolver(operador: Operador, solicitud: SolicitudDeRecepcion): Promise<RenglonesResueltos> {
    const solicitados: RenglonSolicitado[] = [];
    for (const renglon of solicitud.renglones) {
      solicitados.push({
        articuloId: renglon.articuloId,
        loteId: await this.loteDe(operador, renglon),
        cantidad: renglon.cantidad,
        unidadId: renglon.unidadId,
        costoTotal: renglon.monto,
      });
    }
    return this.resolutor.resolver(solicitados);
  }

  private async loteDe(operador: Operador, renglon: RenglonDeRecepcionSolicitado): Promise<string | null> {
    if (!renglon.loteNuevo) return renglon.loteId;
    const { catalogos, lotes } = this.dependencias;
    const [articulo] = await catalogos.articulos([renglon.articuloId]);
    if (!articulo) throw new RecursoNoEncontrado('El artículo');
    const datos = lotePermitido(
      { manejaLotes: articulo.manejaLotes, manejaVencimiento: articulo.manejaVencimiento ?? false },
      { ...renglon.loteNuevo, observaciones: null },
    );
    return (await lotes.agregar(operador.empresaId, articulo.id, datos)).id;
  }
}
