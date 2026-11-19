import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { planDeSalida } from '../../../dominio/salida-por-consumo.js';
import type { DocumentoDto, SolicitudDeSalida, VistaDelKardex } from '../../dto/documento.dto.js';
import type { DependenciasDelKardex } from '../../kardex/dependencias-del-kardex.js';
import { eventoDeSalida } from '../../kardex/eventos-del-kardex.js';
import { RegistradorDeDocumento } from '../../kardex/registrador-de-documento.js';
import { ResolutorDeRenglones, type RenglonesResueltos } from '../../kardex/resolutor-de-renglones.js';
import { documentoSegunLaVista } from '../../kardex/vista-del-kardex.js';

/** El concepto que escribió el usuario o, si no, el que propone el primer artículo (INV-A10). */
function conceptoDeLaSalida(solicitud: SolicitudDeSalida, { renglones, articulos }: RenglonesResueltos): string | null {
  if (solicitud.conceptoDeGastoId) return solicitud.conceptoDeGastoId;
  return articulos.get(renglones[0]?.articuloId ?? '')?.conceptoDeGastoId ?? null;
}

export class RegistrarSalida {
  private readonly registrador: RegistradorDeDocumento;
  private readonly resolutor: ResolutorDeRenglones;

  constructor(private readonly dependencias: DependenciasDelKardex) {
    this.registrador = new RegistradorDeDocumento(dependencias);
    this.resolutor = new ResolutorDeRenglones(dependencias.catalogos);
  }

  /**
   * Una salida por consumo (§6.5): mercadería que sale a gasto, con su concepto de gasto y su centro de costo. El costo
   * lo pone el método de costeo; la salida nunca deja la existencia negativa, en ninguna fecha. Publica
   * `salida_registrada` al confirmar.
   * @throws DocumentoInvalido si falta el concepto de gasto o no hay renglones.
   * @throws DestinoNoDisponible si el destino necesita Activos fijos.
   * @throws RecursoNoEncontrado si algo de lo elegido no existe o no se ve.
   * @throws ExistenciaNegativa, MesCerrado, FechaAnteriorAlInicio, LoteObligatorio, UnidadSinConversion.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeSalida, vista: VistaDelKardex): Promise<DocumentoDto> {
    const { unidadDeTrabajo, publicadorEventos, consultas, catalogos } = this.dependencias;
    const { registro, articulos, dto } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const resueltos = await this.resolutor.resolver(solicitud.renglones);
      const conceptoDeGastoId = conceptoDeLaSalida(solicitud, resueltos);
      const plan = planDeSalida({ ...solicitud, conceptoDeGastoId, renglones: resueltos.renglones });
      await catalogos.exigirReferencias({ ...solicitud, conceptoDeGastoId });
      const registro = await this.registrador.registrar(operador, { plan, articulos: resueltos.articulos });
      return { registro, articulos: resueltos.articulos, dto: await consultas.documento(registro.documento.id) };
    });
    const { documento, movimientos } = registro;
    await publicadorEventos.publicar([
      eventoDeSalida({ empresaId: operador.empresaId, documento, movimientos, articulos }),
      ...registro.eventosDeRecalculo,
    ]);
    return documentoSegunLaVista(dto, vista);
  }
}
