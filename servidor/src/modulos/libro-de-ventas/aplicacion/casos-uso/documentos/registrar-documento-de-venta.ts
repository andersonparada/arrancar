import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { armarDocumentoDeVenta, type SolicitudArmada } from '../../../dominio/armado-del-documento.js';
import type { DocumentoDeVenta } from '../../../dominio/documento-de-venta.js';
import { DocumentoDeVentaRegistrado } from '../../../dominio/eventos.js';
import { primerDiaDelMes } from '../../../dominio/fechas-del-libro.js';
import { resolverTipoDeDocumento } from '../../../dominio/resolver-tipo.js';
import type { RegistroDeDocumentoDeVentaDto } from '../../dto/documento-de-venta.dto.js';
import type { SolicitudDeDocumentoDeVenta } from '../../dto/solicitud-de-documento.js';
import { DocumentoRepetido } from '../../errores.js';
import type {
  CatalogosParaDocumentos,
  ControlDePeriodosParaVentas,
  DestinosDeVenta,
  RepositorioDeDocumentosDeVenta,
} from '../../puertos/puertos-de-documentos.js';
import { CargadorDeContexto, type DependenciasDelCargador } from './cargador-de-contexto.js';
import { paraElDestino, paraElEvento } from './documento-para-otros-modulos.js';
import { revisarElPeriodo } from './guardia-del-periodo.js';
import { resolverLineas } from './resolutor-de-lineas.js';

interface Dependencias extends DependenciasDelCargador {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDocumentosDeVenta;
  catalogos: CatalogosParaDocumentos;
  control: ControlDePeriodosParaVentas;
  destinos: DestinosDeVenta;
  publicadorEventos: PublicadorEventos;
}

/** La solicitud con el tipo resuelto, las líneas en centavos y el IVA del DTE en centavos. */
function solicitudArmada(
  solicitud: SolicitudDeDocumentoDeVenta,
  resto: Pick<SolicitudArmada, 'tipo' | 'tipoDte' | 'lineas'>,
): SolicitudArmada {
  return { ...solicitud, ...resto, ivaDelDte: solicitud.ivaDelDte ? aCentavos(solicitud.ivaDelDte) : null };
}

/**
 * Registra un documento de venta (`docs/modulos/diseno-cuentas-por-cobrar-y-ventas.md` §7.1): toma el régimen de la
 * empresa **del mes del documento**, valida las reglas fiscales del dominio (derogación, fecha de inicio, notas,
 * receptor, destino), calcula líneas y totales, rechaza el repetido, lo guarda con sus líneas y, si va a la cartera, le
 * manda `cuentas-por-cobrar.recibir_documento` en la misma transacción (si responde con error, no se registra nada).
 * Tras confirmar publica `documento_registrado`. Un documento no se edita: se anula o se elimina.
 */
export class RegistrarDocumentoDeVenta {
  private readonly cargador: CargadorDeContexto;

  constructor(private readonly dependencias: Dependencias) {
    this.cargador = new CargadorDeContexto(dependencias);
  }

  /**
   * @throws las reglas del dominio y de `CargadorDeContexto`; PeriodoDeclarado, DocumentoRepetido, y el error de la
   *   cartera si rechaza el documento.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeDocumentoDeVenta): Promise<RegistroDeDocumentoDeVentaDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { documento, salida } = await unidadDeTrabajo.ejecutar(operador, () => this.registrar(operador, solicitud));
    await publicadorEventos.publicar([new DocumentoDeVentaRegistrado(paraElEvento(documento))]);
    return salida;
  }

  private async registrar(operador: Operador, solicitud: SolicitudDeDocumentoDeVenta) {
    const { repositorio } = this.dependencias;
    const avisosDelPeriodo = await revisarElPeriodo(this.dependencias.control, primerDiaDelMes(solicitud.fechaEmision));
    const { armado, tieneVentaDeActivo } = await this.armar(operador, solicitud);
    const { documento } = armado;
    await this.exigirQueNoEsteRepetido(documento);
    await repositorio.agregar(documento);
    const avisosDelDestino = await this.enviarAlDestino(operador, documento, tieneVentaDeActivo);
    const guardado = await repositorio.buscar(documento.id, false);
    const avisos = [...avisosDelPeriodo, ...armado.avisos, ...avisosDelDestino];
    return { documento, salida: { documento: guardado!.ficha, avisos } };
  }

  /** El contexto, las líneas y el documento armado con todas las reglas fiscales. */
  private async armar(operador: Operador, solicitud: SolicitudDeDocumentoDeVenta) {
    const { tipo, tipoDte } = resolverTipoDeDocumento(solicitud);
    const contexto = await this.cargador.cargar(operador, solicitud);
    const { lineas, tieneVentaDeActivo } = await resolverLineas(this.dependencias.catalogos, solicitud.lineas);
    const armado = armarDocumentoDeVenta(solicitudArmada(solicitud, { tipo, tipoDte, lineas }), contexto);
    return { armado, tieneVentaDeActivo };
  }

  /** Si va a la cartera, se la manda en la misma transacción; sus avisos se suman a los del registro. */
  private async enviarAlDestino(operador: Operador, documento: DocumentoDeVenta, tieneVentaDeActivo: boolean) {
    if (!documento.destino) return [];
    return this.dependencias.destinos.recibir(
      operador,
      documento.destino,
      paraElDestino(documento, tieneVentaDeActivo),
    );
  }

  private async exigirQueNoEsteRepetido(documento: DocumentoDeVenta): Promise<void> {
    const repetido = await this.dependencias.repositorio.buscarRepetido({
      tipoOTipoDte: documento.tipoDte ?? documento.tipo,
      serie: documento.serie,
      numero: documento.numero,
      autorizacionFel: documento.autorizacionFel,
    });
    if (repetido) throw new DocumentoRepetido(repetido.id);
  }
}
