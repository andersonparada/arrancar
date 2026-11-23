import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { BodegaFueraDeAlcance, ElementoInactivo } from '../../../dominio/errores-de-kardex.js';
import { planDeSalidaDeTraslado } from '../../../dominio/traslado.js';
import type { DocumentoDto, SolicitudDeTraslado, VistaDelKardex } from '../../dto/documento.dto.js';
import { eventoDeTraslado } from '../../kardex/eventos-del-kardex.js';
import { RecepcionDeTraslado } from '../../kardex/recepcion-de-traslado.js';
import { RegistradorDeDocumento, type ResultadoDeRegistro } from '../../kardex/registrador-de-documento.js';
import { ResolutorDeRenglones } from '../../kardex/resolutor-de-renglones.js';
import { documentoSegunLaVista } from '../../kardex/vista-del-kardex.js';
import type { DependenciasDeTraslados } from './dependencias-de-traslados.js';

/**
 * Traslada artículos de una bodega a otra de la misma empresa (§6.7). Neutro para el costeo: las dos mitades son
 * movimientos `traslado` que no cambian el costo ni el valor del artículo.
 */
export class TrasladarArticulos {
  private readonly registrador: RegistradorDeDocumento;
  private readonly recepcion: RecepcionDeTraslado;
  private readonly resolutor: ResolutorDeRenglones;

  constructor(private readonly dependencias: DependenciasDeTraslados) {
    this.registrador = new RegistradorDeDocumento(dependencias);
    this.recepcion = new RecepcionDeTraslado(dependencias);
    this.resolutor = new ResolutorDeRenglones(dependencias.catalogos);
  }

  /**
   * Sin tránsito (`inventarios.traslados.con_transito = false`) crea las dos mitades con la misma fecha y exige ver las
   * dos bodegas; con tránsito, la salida queda `en_transito` y la recibe quien ve el destino. Publica
   * `traslado_registrado` al confirmar.
   * @throws TrasladoALaMismaBodega si el destino es el origen.
   * @throws RecursoNoEncontrado si algo de lo elegido no existe o no se ve (el origen siempre se debe ver).
   * @throws BodegaFueraDeAlcance si sin tránsito no ve la bodega de destino.
   * @throws ElementoInactivo si el destino está inactivo.
   * @throws ExistenciaNegativa, MesCerrado, FechaAnteriorAlInicio, LoteObligatorio, UnidadSinConversion.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeTraslado, vista: VistaDelKardex): Promise<DocumentoDto> {
    const { unidadDeTrabajo, publicadorEventos, consultas } = this.dependencias;
    const conTransito = await this.dependencias.transito.conTransito(operador);
    const { eventos, dto } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const hecho = await this.trasladar(operador, solicitud, conTransito);
      return { eventos: hecho.eventos, dto: await consultas.documento(hecho.documentoId) };
    });
    await publicadorEventos.publicar(eventos);
    return documentoSegunLaVista(dto, vista);
  }

  private async trasladar(operador: Operador, solicitud: SolicitudDeTraslado, conTransito: boolean) {
    const { almacen } = this.dependencias;
    await almacen.bloquear(solicitud.renglones.map((renglon) => renglon.articuloId));
    const { renglones, articulos } = await this.resolutor.resolver(solicitud.renglones);
    const plan = planDeSalidaDeTraslado({ ...solicitud, renglones, conTransito });
    await this.exigirDestino(solicitud.bodegaDeDestinoId, conTransito);
    const salida = await this.registrador.registrar(operador, { plan, articulos });
    const eventos: EventoDominio[] = [...salida.eventosDeRecalculo];
    let documento = salida.documento;
    if (!conTransito) {
      const { entrada, salida: recibida } = await this.recibir(operador, solicitud, salida);
      documento = recibida;
      eventos.push(...entrada.eventosDeRecalculo);
    }
    const datos = { empresaId: operador.empresaId, salida: documento, movimientos: salida.movimientos, articulos };
    return { eventos: [eventoDeTraslado(datos), ...eventos], documentoId: documento.id };
  }

  private recibir(operador: Operador, solicitud: SolicitudDeTraslado, salida: ResultadoDeRegistro) {
    return this.recepcion.registrar(operador, {
      salida: salida.documento,
      movimientosDeLaSalida: salida.movimientos,
      fecha: solicitud.fecha,
      observaciones: null,
    });
  }

  /** El destino debe existir en la empresa y estar activo; sin tránsito, además, el usuario debe verlo. */
  private async exigirDestino(bodegaId: string, conTransito: boolean): Promise<void> {
    const { catalogos } = this.dependencias;
    const destino = await catalogos.bodegaParaTraslado(bodegaId);
    if (!destino) throw new RecursoNoEncontrado('La bodega de destino');
    if (!destino.activo) throw new ElementoInactivo(`La bodega ${destino.nombre}`);
    if (!conTransito && !(await catalogos.bodega(bodegaId))) {
      throw new BodegaFueraDeAlcance(
        `Un traslado sin tránsito exige ver las dos bodegas: no tiene asignada la bodega ${destino.nombre}.`,
      );
    }
  }
}
