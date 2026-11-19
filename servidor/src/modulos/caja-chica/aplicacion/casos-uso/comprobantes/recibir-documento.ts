import { ErrorEsperado } from '../../../../core/compartido/dominio/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { DocumentoParaDestino } from '../../../../core/contratos/libro-de-compras.contratos.js';
import type { Comprobante } from '../../../dominio/comprobantes.js';
import { DocumentoYaRecibido, FacturaDeLaNotaNoRecibida } from '../../../dominio/errores-de-comprobantes.js';
import type { DocumentoRecibido } from '../../puertos/puertos-de-comprobantes.js';
import { AsignadorDeComprobantes } from './asignador-de-comprobantes.js';
import { avisoDeRetencionEnLaBandeja } from './avisos-de-comprobantes.js';
import type { DependenciasDeComprobantes } from './dependencias-de-comprobantes.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIN_EXCEPCIONES = { sobreElTope: false, conRetencion: false };

/** Lo que responde la orden: los avisos que el libro suma a los suyos, y los eventos que se publican al confirmar. */
interface Resultado {
  avisos: string[];
  eventos: EventoDominio[];
}

/**
 * Atiende la orden `caja-chica.recibir_documento` (§5.4 a): corre dentro de la transacción del libro, así que si algo falla
 * no se registra nada. El documento siempre entra a la bandeja (con retención también: la excepción se autoriza al asignar,
 * nunca aquí). Sin retención y con la referencia de un fondo, intenta asignarlo; si no se puede (fondo cerrado o ajeno,
 * fecha, tope, efectivo) queda en la bandeja con un aviso. No audita (es un alta).
 */
export class RecibirDocumento {
  private readonly asignador: AsignadorDeComprobantes;
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: DependenciasDeComprobantes) {
    this.asignador = new AsignadorDeComprobantes(dependencias);
    this.lector = new LectorDelFondo({ fondos: dependencias.fondos, consultas: dependencias.consultasDeFondos });
  }

  /**
   * @throws DocumentoYaRecibido si el documento ya había llegado.
   * @throws FacturaDeLaNotaNoRecibida si la nota de crédito corrige una factura que no está en Caja chica.
   */
  async ejecutar(operador: Operador, documento: DocumentoParaDestino): Promise<{ avisos: string[] }> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { avisos, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.recibir(operador, documento));
    await publicadorEventos.publicar(eventos);
    return { avisos };
  }

  private async recibir(operador: Operador, documento: DocumentoParaDestino): Promise<Resultado> {
    const { comprobantes } = this.dependencias;
    if (await comprobantes.buscarDelDocumento(documento.documentoId)) throw new DocumentoYaRecibido();
    const id = await comprobantes.agregarDocumento(await this.nuevo(documento));
    const comprobante = (await comprobantes.buscar(id))!;
    if (comprobante.conRetencion) return { avisos: [avisoDeRetencionEnLaBandeja(comprobante)], eventos: [] };
    const fondoId = documento.referenciaDeDestino ?? null;
    if (fondoId === null) return { avisos: [], eventos: [] };
    return this.intentarAsignar(operador, { comprobante, fondoId });
  }

  private async nuevo(documento: DocumentoParaDestino): Promise<DocumentoRecibido> {
    const esNota = documento.tipo === 'nota_de_credito';
    return {
      documentoDeCompraId: documento.documentoId,
      proveedorId: documento.proveedorId,
      fecha: documento.fechaEmision,
      montoCentavos: documento.totalCentavos - documento.retencionesCentavos,
      montoRetenidoCentavos: documento.retencionesCentavos,
      esNotaDeCredito: esNota,
      documentoAfectadoId: esNota ? await this.facturaDeLaNota(documento) : null,
      conActivoFijo: documento.tieneActivoFijo,
    };
  }

  /** El comprobante de la factura que rebaja la nota; una factura del sistema anterior no puede estar aquí. */
  private async facturaDeLaNota(documento: DocumentoParaDestino): Promise<string> {
    const afectado = documento.facturaAnterior ? null : documento.documentoAfectadoId;
    const factura = afectado === null ? null : await this.dependencias.comprobantes.buscarDelDocumento(afectado);
    if (!factura) throw new FacturaDeLaNotaNoRecibida();
    return factura.id;
  }

  /** Lo que no se puede asignar no rechaza el documento: queda en la bandeja con el motivo como aviso. */
  private async intentarAsignar(
    operador: Operador,
    por: { comprobante: Comprobante; fondoId: string },
  ): Promise<Resultado> {
    const { comprobante, fondoId } = por;
    try {
      if (!ES_UUID.test(fondoId)) return this.enLaBandeja('el fondo indicado no es válido.');
      const fondo = await this.lector.bloquear(fondoId);
      const permisos = SIN_EXCEPCIONES;
      const resultado = await this.asignador.asignar(operador, { comprobante, fondo, permisos });
      return { avisos: resultado.avisos, eventos: [resultado.evento] };
    } catch (error) {
      if (!(error instanceof ErrorEsperado)) throw error;
      return this.enLaBandeja(error.message);
    }
  }

  private enLaBandeja(motivo: string): Resultado {
    return { avisos: [`Quedó en la bandeja de Caja chica: ${motivo}`], eventos: [] };
  }
}
