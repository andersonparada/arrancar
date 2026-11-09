import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { DocumentoParaDestino } from '../../../core/contratos/libro-de-compras.contratos.js';
import { avisoDeSaldoALaFavor } from '../../dominio/avisos.js';
import { DocumentoYaRecibido } from '../../dominio/errores.js';
import { fechaBaseDelPlazo, proponerVencimiento } from '../../dominio/propuesta-de-vencimiento.js';
import { repartirNotaDeCredito } from '../../dominio/reparto-de-nota-de-credito.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import { claseDe } from '../../dominio/tipos-de-documento.js';
import type {
  CondicionesDeProveedores,
  ConsultasDeCargos,
  DocumentosDeCompra,
  PlazoPorOmision,
  RepositorioDeAplicaciones,
  RepositorioDeDocumentos,
} from '../puertos/puertos-de-documentos.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  documentos: RepositorioDeDocumentos;
  aplicaciones: RepositorioDeAplicaciones;
  cargos: ConsultasDeCargos;
  condiciones: CondicionesDeProveedores;
  documentosDeCompra: DocumentosDeCompra;
  plazo: PlazoPorOmision;
}

/** Lo que responde la orden: los avisos que Libro de compras suma a los suyos. */
export interface ResultadoDeRecibir {
  avisos: string[];
}

/**
 * Atiende la orden `cuentas-por-pagar.recibir_documento`: corre dentro de la transacción de Libro de compras, así que
 * si algo falla no se registra nada. Guarda el documento como `pendiente` (todo tipo entra) y, si es un cargo, le propone
 * el vencimiento (la fecha de emisión, o la de recepción si el proveedor así lo pactó, más sus días de crédito, o el plazo por omisión). Una nota de crédito no vence:
 * se aplica sola a su factura y, si sobra, a las notas de débito de esa factura; lo que quede es su saldo libre. Una nota
 * de débito es un cargo más, con su propio vencimiento. No audita (es un alta) ni marca el documento como procesado.
 */
export class RecibirDocumento {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Devuelve los avisos que no bloquean: el de una nota de crédito que deja saldo libre (a favor de la empresa).
   * @throws DocumentoYaRecibido si el documento ya había llegado.
   */
  ejecutar(operador: Operador, documento: DocumentoParaDestino): Promise<ResultadoDeRecibir> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      if (await this.dependencias.documentos.existe(documento.documentoId)) throw new DocumentoYaRecibido();
      const guardado = await this.guardar(operador, documento);
      if (guardado.tipo !== 'nota_de_credito') return { avisos: [] };
      const saldoLibreCentavos = await this.aplicarALaFactura(guardado);
      return { avisos: saldoLibreCentavos > 0 ? [avisoDeSaldoALaFavor(saldoLibreCentavos)] : [] };
    });
  }

  private async guardar(operador: Operador, documento: DocumentoParaDestino): Promise<DocumentoPorPagar> {
    const { fechaRecepcion, serie, numero } = await this.dependencias.documentosDeCompra.datosDeRecepcion(
      documento.documentoId,
    );
    const esCargo = claseDe(documento.tipo) === 'cargo';
    const vencimiento = esCargo ? await this.vencimientoPara(operador, documento, fechaRecepcion) : null;
    return this.dependencias.documentos.agregar({
      documentoId: documento.documentoId,
      serie,
      numero,
      tipo: documento.tipo,
      proveedorId: documento.proveedorId,
      documentoAfectadoId: documento.documentoAfectadoId,
      fechaEmision: documento.fechaEmision,
      totalCentavos: documento.totalCentavos,
      retencionesCentavos: documento.retencionesCentavos,
      tieneActivoFijo: documento.tieneActivoFijo,
      vencimiento,
    });
  }

  private async vencimientoPara(
    operador: Operador,
    documento: DocumentoParaDestino,
    fechaRecepcion: string,
  ): Promise<string> {
    const { condiciones, plazo } = this.dependencias;
    const { diasDeCredito, contarDesdeLaRecepcion } = await condiciones.deProveedor(documento.proveedorId);
    const fechaBase = fechaBaseDelPlazo({
      fechaEmision: documento.fechaEmision,
      fechaRecepcion,
      contarDesdeLaRecepcion,
    });
    return proponerVencimiento({ fechaBase, diasDeCredito, mesesPorOmision: await plazo.meses(operador) });
  }

  /** Aplica la nota a su factura y a las notas de débito de esa factura; devuelve lo que quedó libre, en centavos. */
  private async aplicarALaFactura(nota: DocumentoPorPagar): Promise<number> {
    const { cargos, aplicaciones } = this.dependencias;
    if (nota.documentoAfectadoId === null) return nota.totalCentavos;
    const posibles = await cargos.paraAplicarUnaNota(nota.documentoAfectadoId);
    const reparto = repartirNotaDeCredito(nota.totalCentavos, posibles);
    if (reparto.aplicaciones.length > 0) await aplicaciones.agregar(nota, reparto.aplicaciones);
    return reparto.saldoLibreCentavos;
  }
}
