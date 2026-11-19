import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavosEnteros } from '../../../dominio/decimales.js';
import { LineaNoRecibible } from '../../../dominio/errores-de-recepcion.js';
import { exigirCapacidadDeLinea, exigirNotaAplicable, type LineaDeCompra } from '../../../dominio/linea-de-compra.js';
import { planDeRebaja } from '../../../dominio/rebaja.js';
import type { DocumentoDto, VistaDelKardex } from '../../dto/documento.dto.js';
import type { SolicitudDeRebaja } from '../../dto/por-recibir.dto.js';
import { eventoDeCostoAjustado } from '../../kardex/eventos-de-recepciones.js';
import { RegistradorDeDocumento } from '../../kardex/registrador-de-documento.js';
import { documentoSegunLaVista } from '../../kardex/vista-del-kardex.js';
import type { DependenciasDeRecepciones } from './dependencias-de-recepciones.js';

export class RegistrarRebajaDeCosto {
  private readonly registrador: RegistradorDeDocumento;

  constructor(private readonly dependencias: DependenciasDeRecepciones) {
    this.registrador = new RegistradorDeDocumento(dependencias);
  }

  /**
   * Una nota de crédito sin devolución física baja el costo de las entradas de su factura (§6.3, §7.5): el monto se
   * reparte entre ellas por su valor o su cantidad y el motor decide cuánto absorbe la existencia (baja el valor del
   * artículo) y cuánto va a resultados (lo que ya salió). No tiene bodega ni mueve existencias. Publica `costo_ajustado`.
   * @throws LineaNoRecibible, LineaDescartada si la nota no se puede aplicar; LineaSobrerrecibida si el monto pasa del costo
   *   de la línea que falta por aplicar.
   * @throws DocumentoInvalido si la factura no tiene entradas o la fecha es anterior a ellas.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeRebaja, vista: VistaDelKardex): Promise<DocumentoDto> {
    const { unidadDeTrabajo, publicadorEventos, consultas } = this.dependencias;
    const { registro, articulos, dto } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const { plan, articulos } = await this.planear(solicitud);
      const registro = await this.registrador.registrar(operador, { plan, articulos });
      return { registro, articulos, dto: await consultas.documento(registro.documento.id) };
    });
    const { documento, movimientos } = registro;
    await publicadorEventos.publicar([
      eventoDeCostoAjustado({ empresaId: operador.empresaId, documento, movimientos, articulos }),
      ...registro.eventosDeRecalculo,
    ]);
    return documentoSegunLaVista(dto, vista);
  }

  private async planear(solicitud: SolicitudDeRebaja) {
    const { lineas, almacen, recepciones, catalogos } = this.dependencias;
    await lineas.bloquear([solicitud.lineaId]);
    const nota = await this.nota(solicitud);
    const factura = nota.documentoAfectadoId!;
    await almacen.bloquear((await recepciones.entradasDeLaFactura(factura)).map((entrada) => entrada.articuloId));
    const entradas = await recepciones.entradasDeLaFactura(factura);
    const articulos = new Map(
      (await catalogos.articulos([...new Set(entradas.map((entrada) => entrada.articuloId))])).map((a) => [a.id, a]),
    );
    const plan = planDeRebaja({
      fecha: solicitud.fecha,
      documentoDeCompraId: nota.documentoId,
      lineaDeCompraId: nota.lineaId,
      montoCentavos: aCentavosEnteros(solicitud.monto),
      base: solicitud.base,
      observaciones: solicitud.observaciones,
      entradas,
    });
    return { plan, articulos };
  }

  private async nota(solicitud: SolicitudDeRebaja): Promise<LineaDeCompra> {
    const [nota] = await this.dependencias.lineas.buscar([solicitud.lineaId]);
    if (!nota) throw new LineaNoRecibible();
    exigirNotaAplicable(nota);
    exigirCapacidadDeLinea(nota, aCentavosEnteros(solicitud.monto));
    return nota;
  }
}
