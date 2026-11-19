import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { planDeEntradaManual } from '../../../dominio/entrada-manual.js';
import type { DocumentoDto, SolicitudDeEntrada, VistaDelKardex } from '../../dto/documento.dto.js';
import type { DependenciasDelKardex } from '../../kardex/dependencias-del-kardex.js';
import { eventoDeEntrada } from '../../kardex/eventos-del-kardex.js';
import { RegistradorDeDocumento } from '../../kardex/registrador-de-documento.js';
import { ResolutorDeRenglones } from '../../kardex/resolutor-de-renglones.js';
import { documentoSegunLaVista } from '../../kardex/vista-del-kardex.js';

export class RegistrarEntradaManual {
  private readonly registrador: RegistradorDeDocumento;
  private readonly resolutor: ResolutorDeRenglones;

  constructor(private readonly dependencias: DependenciasDelKardex) {
    this.registrador = new RegistradorDeDocumento(dependencias);
    this.resolutor = new ResolutorDeRenglones(dependencias.catalogos);
  }

  /**
   * Una entrada manual (§6.4): mercadería que entra sin pasar por el libro (producción propia, donación recibida, aporte
   * u otra causa), con soporte escrito y el costo de cada renglón. Mueve el kardex y las existencias, y recalcula el
   * costo de las salidas posteriores si la fecha es anterior a movimientos ya registrados. Publica `entrada_registrada`
   * (y `costo_recalculado` si algo cambió) al confirmar.
   * @throws DocumentoInvalido si falta el soporte o un costo, o no hay renglones.
   * @throws RecursoNoEncontrado si la bodega, un artículo, una unidad o un lote no existen o no se ven.
   * @throws ExistenciaNegativa, MesCerrado, FechaAnteriorAlInicio, LoteObligatorio, UnidadSinConversion.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeEntrada, vista: VistaDelKardex): Promise<DocumentoDto> {
    const { unidadDeTrabajo, publicadorEventos, consultas } = this.dependencias;
    const { registro, plan, articulos, dto } = await unidadDeTrabajo.ejecutar(operador, async () => {
      await this.dependencias.almacen.bloquear(solicitud.renglones.map((renglon) => renglon.articuloId));
      const resueltos = await this.resolutor.resolver(solicitud.renglones);
      const plan = planDeEntradaManual({ ...solicitud, renglones: resueltos.renglones });
      const registro = await this.registrador.registrar(operador, { plan, articulos: resueltos.articulos });
      return { registro, plan, articulos: resueltos.articulos, dto: await consultas.documento(registro.documento.id) };
    });
    const { documento, movimientos } = registro;
    await publicadorEventos.publicar([
      eventoDeEntrada({ empresaId: operador.empresaId, documento, movimientos, articulos }),
      ...registro.eventosDeRecalculo,
    ]);
    return documentoSegunLaVista({ ...dto, avisos: [...plan.avisos] }, vista);
  }
}
