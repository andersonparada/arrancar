import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { planDeDevolucion, type EntradaDevolvible, type RenglonDevuelto } from '../../../dominio/devolucion.js';
import { LineaNoRecibible } from '../../../dominio/errores-de-recepcion.js';
import type { LineaDeCompra } from '../../../dominio/linea-de-compra.js';
import type { DocumentoDto, RenglonSolicitado, VistaDelKardex } from '../../dto/documento.dto.js';
import type { SolicitudDeDevolucion } from '../../dto/por-recibir.dto.js';
import { eventoDeDevolucion } from '../../kardex/eventos-de-recepciones.js';
import { RegistradorDeDocumento } from '../../kardex/registrador-de-documento.js';
import { ResolutorDeRenglones } from '../../kardex/resolutor-de-renglones.js';
import { documentoSegunLaVista } from '../../kardex/vista-del-kardex.js';
import type { DependenciasDeRecepciones } from './dependencias-de-recepciones.js';

export class RegistrarDevolucionAProveedor {
  private readonly registrador: RegistradorDeDocumento;
  private readonly resolutor: ResolutorDeRenglones;

  constructor(private readonly dependencias: DependenciasDeRecepciones) {
    this.registrador = new RegistradorDeDocumento(dependencias);
    this.resolutor = new ResolutorDeRenglones(dependencias.catalogos);
  }

  /**
   * Devuelve a un proveedor mercadería de entradas de recepciones, respaldada por una línea de una nota de crédito de
   * la factura (§6.3). Sale de la bodega de las entradas al costo de cada una; con PEPS rebaja la capa de la entrada
   * devuelta (§7.4). Si el costo del artículo cambia en el kardex, lo recalcula. Publica `devolucion_a_proveedor`.
   * @throws RecursoNoEncontrado si una entrada no existe, no es de una recepción vigente o no se ve su bodega.
   * @throws LineaNoRecibible, LineaDescartada si la nota no se puede aplicar.
   * @throws NotaNoCorrespondeALasEntradas, DevolucionMayorQueLaEntrada, DocumentoInvalido, ExistenciaNegativa.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeDevolucion, vista: VistaDelKardex): Promise<DocumentoDto> {
    const { unidadDeTrabajo, publicadorEventos, consultas } = this.dependencias;
    const { registro, articulos, dto } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const { plan, articulos } = await this.planear(solicitud);
      const registro = await this.registrador.registrar(operador, { plan, articulos });
      return {
        registro,
        articulos,
        dto: { ...(await consultas.documento(registro.documento.id)), avisos: [...plan.avisos] },
      };
    });
    const { documento, movimientos } = registro;
    await publicadorEventos.publicar([
      eventoDeDevolucion({ empresaId: operador.empresaId, documento, movimientos, articulos }),
      ...registro.eventosDeRecalculo,
    ]);
    return documentoSegunLaVista(dto, vista);
  }

  private async planear(solicitud: SolicitudDeDevolucion) {
    const { lineas, almacen } = this.dependencias;
    await lineas.bloquear([solicitud.lineaId]);
    const ids = [...new Set(solicitud.renglones.map((renglon) => renglon.movimientoDeEntradaId))];
    await almacen.bloquear((await this.entradas(ids)).map((entrada) => entrada.articuloId));
    const entradas = new Map((await this.entradas(ids)).map((entrada) => [entrada.movimientoId, entrada]));
    const resueltos = await this.resolutor.resolver(this.solicitados(solicitud, entradas));
    const devueltos: RenglonDevuelto[] = resueltos.renglones.map((renglon, indice) => ({
      entrada: entradas.get(solicitud.renglones[indice]!.movimientoDeEntradaId)!,
      renglon,
    }));
    const nota = await this.nota(solicitud.lineaId);
    return { plan: planDeDevolucion({ ...solicitud, nota, renglones: devueltos }), articulos: resueltos.articulos };
  }

  private async entradas(ids: readonly string[]): Promise<EntradaDevolvible[]> {
    const entradas = await this.dependencias.recepciones.entradasDevolvibles(ids);
    if (entradas.length !== ids.length) throw new RecursoNoEncontrado('La entrada');
    return entradas;
  }

  private async nota(lineaId: string): Promise<LineaDeCompra> {
    const [nota] = await this.dependencias.lineas.buscar([lineaId]);
    if (!nota) throw new LineaNoRecibible();
    return nota;
  }

  /** Cada renglón con el artículo y el lote de su entrada: la devolución siempre es de lo mismo que entró. */
  private solicitados(
    solicitud: SolicitudDeDevolucion,
    entradas: ReadonlyMap<string, EntradaDevolvible>,
  ): RenglonSolicitado[] {
    return solicitud.renglones.map((renglon) => {
      const entrada = entradas.get(renglon.movimientoDeEntradaId)!;
      return {
        articuloId: entrada.articuloId,
        loteId: entrada.loteId,
        cantidad: renglon.cantidad,
        unidadId: renglon.unidadId,
        costoTotal: null,
      };
    });
  }
}
